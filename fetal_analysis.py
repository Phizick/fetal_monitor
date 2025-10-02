#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Анализ данных фетального мониторинга
Анализирует данные из CSV файла и выводит результаты
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV
import joblib
import warnings
warnings.filterwarnings('ignore')

# Настройка для корректного отображения русского текста
plt.rcParams['font.family'] = 'DejaVu Sans'

class FetalHealthAnalyzer:
    """
    Класс для анализа данных фетального мониторинга
    Загружает данные, выполняет анализ и создает визуализации
    """
    
    def __init__(self, csv_file):
        """
        Инициализация анализатора
        Args:
            csv_file (str): путь к CSV файлу с данными
        """
        self.csv_file = csv_file
        self.data = None
        self.X = None
        self.y = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None
        self.scaler = None
        self.predictions = None
        self.probabilities = None
        self.risk_assessments = None
        
    def load_data(self):
        """
        Загружает данные из CSV файла
        Returns:
            pandas.DataFrame: загруженные данные
        """
        print("Загрузка данных...")
        self.data = pd.read_csv(self.csv_file)
        print(f"Данные загружены: {self.data.shape[0]} записей, {self.data.shape[1]} параметров")
        return self.data
    
    
    def diagnose_patients_by_criteria(self):
        """
        Ставит диагнозы пациенткам на основе медицинских талагоний
        """
        print("\n" + "="*60)
        print("ДИАГНОСТИКА ПАЦИЕНТОК НА ОСНОВЕ МЕДИЦИНСКИХ ТАЛАГОНИЙ")
        print("="*60)
        
        diagnoses = []
        
        for idx, row in self.data.iterrows():
            patient_diagnosis = {
                'patient_id': idx,
                'primary_diagnosis': 'Нормальное течение беременности',
                'secondary_diagnoses': '',
                'severity': 'Норма',
                'recommendations': 'Плановое наблюдение'
            }
            
            # Критерии для различных патологий
            
            # 1. ГИПОКСИЯ ПЛОДА
            hypoxia_criteria = []
            if row['baseline value'] < 110:  # Брадикардия
                hypoxia_criteria.append("Брадикардия (базовый ритм < 110 уд/мин)")
            if row['baseline value'] > 160:  # Тахикардия
                hypoxia_criteria.append("Тахикардия (базовый ритм > 160 уд/мин)")
            if row['severe_decelerations'] > 0.01:
                hypoxia_criteria.append("Выраженные децелерации")
            if row['prolongued_decelerations'] > 0.005:
                hypoxia_criteria.append("Пролонгированные децелерации")
            if row['accelerations'] < 0.001:
                hypoxia_criteria.append("Отсутствие ускорений")
            
            if len(hypoxia_criteria) >= 2:
                patient_diagnosis['primary_diagnosis'] = 'Гипоксия плода'
                patient_diagnosis['secondary_diagnoses'] = '; '.join(hypoxia_criteria)
                patient_diagnosis['severity'] = 'Критическая' if len(hypoxia_criteria) >= 3 else 'Умеренная'
                patient_diagnosis['recommendations'] = 'Немедленная госпитализация, КТГ-мониторинг'
            
            # 2. ДИСТРЕСС ПЛОДА
            distress_criteria = []
            if row['abnormal_short_term_variability'] > 70:
                distress_criteria.append("Выраженная аномальная краткосрочная вариабельность")
            if row['percentage_of_time_with_abnormal_long_term_variability'] > 30:
                distress_criteria.append("Аномальная долгосрочная вариабельность > 30% времени")
            if row['mean_value_of_short_term_variability'] < 0.5:
                distress_criteria.append("Критически низкая краткосрочная вариабельность")
            if row['mean_value_of_long_term_variability'] < 3:
                distress_criteria.append("Критически низкая долгосрочная вариабельность")
            
            if len(distress_criteria) >= 2 and patient_diagnosis['primary_diagnosis'] == 'Нормальное течение беременности':
                patient_diagnosis['primary_diagnosis'] = 'Дистресс плода'
                patient_diagnosis['secondary_diagnoses'] = '; '.join(distress_criteria)
                patient_diagnosis['severity'] = 'Критическая' if len(distress_criteria) >= 3 else 'Умеренная'
                patient_diagnosis['recommendations'] = 'Усиленное наблюдение, дополнительные обследования'
            
            # 3. АСФИКСИЯ ПЛОДА
            asphyxia_criteria = []
            if row['accelerations'] < 0.001 and row['fetal_movement'] < 0.002:
                asphyxia_criteria.append("Отсутствие ускорений и движений плода")
            if row['severe_decelerations'] > 0.015:
                asphyxia_criteria.append("Множественные выраженные децелерации")
            if row['prolongued_decelerations'] > 0.01:
                asphyxia_criteria.append("Множественные пролонгированные децелерации")
            if row['baseline value'] < 100:
                asphyxia_criteria.append("Критическая брадикардия")
            
            if len(asphyxia_criteria) >= 2 and patient_diagnosis['primary_diagnosis'] == 'Нормальное течение беременности':
                patient_diagnosis['primary_diagnosis'] = 'Асфиксия плода'
                patient_diagnosis['secondary_diagnoses'] = '; '.join(asphyxia_criteria)
                patient_diagnosis['severity'] = 'Критическая'
                patient_diagnosis['recommendations'] = 'ЭКСТРЕННАЯ ГОСПИТАЛИЗАЦИЯ, рассмотрение экстренного родоразрешения'
            
            # 4. ПЛАЦЕНТАРНАЯ НЕДОСТАТОЧНОСТЬ
            placental_criteria = []
            if row['mean_value_of_long_term_variability'] < 2:
                placental_criteria.append("Критически низкая долгосрочная вариабельность")
            if row['histogram_width'] < 20:
                placental_criteria.append("Очень узкая гистограмма сердечного ритма")
            if row['histogram_variance'] < 5:
                placental_criteria.append("Критически низкая вариабельность гистограммы")
            if row['percentage_of_time_with_abnormal_long_term_variability'] > 50:
                placental_criteria.append("Аномальная долгосрочная вариабельность > 50% времени")
            
            if len(placental_criteria) >= 2 and patient_diagnosis['primary_diagnosis'] == 'Нормальное течение беременности':
                patient_diagnosis['primary_diagnosis'] = 'Плацентарная недостаточность'
                patient_diagnosis['secondary_diagnoses'] = '; '.join(placental_criteria)
                patient_diagnosis['severity'] = 'Умеренная' if len(placental_criteria) == 2 else 'Выраженная'
                patient_diagnosis['recommendations'] = 'Допплерометрия, контроль роста плода, возможная госпитализация'
            
            # 5. УГРОЗА ПРЕЖДЕВРЕМЕННЫХ РОДОВ
            preterm_criteria = []
            if row['uterine_contractions'] > 0.01:
                preterm_criteria.append("Повышенная сократительная активность матки")
            if row['fetal_movement'] > 0.02:
                preterm_criteria.append("Повышенная двигательная активность плода")
            if row['accelerations'] > 0.015:
                preterm_criteria.append("Частые ускорения сердечного ритма")
            
            if len(preterm_criteria) >= 2 and patient_diagnosis['primary_diagnosis'] == 'Нормальное течение беременности':
                patient_diagnosis['primary_diagnosis'] = 'Угроза преждевременных родов'
                patient_diagnosis['secondary_diagnoses'] = '; '.join(preterm_criteria)
                patient_diagnosis['severity'] = 'Умеренная'
                patient_diagnosis['recommendations'] = 'Токолитическая терапия, постельный режим, контроль'
            
            # 6. ВНУТРИУТРОБНАЯ ЗАДЕРЖКА РАЗВИТИЯ ПЛОДА (ЗВУР)
            iugr_criteria = []
            if row['baseline value'] < 120 and row['accelerations'] < 0.003:
                iugr_criteria.append("Сниженная реактивность сердечного ритма")
            if row['mean_value_of_short_term_variability'] < 1.0 and row['mean_value_of_long_term_variability'] < 5:
                iugr_criteria.append("Сниженная вариабельность сердечного ритма")
            if row['fetal_movement'] < 0.003:
                iugr_criteria.append("Сниженная двигательная активность")
            
            if len(iugr_criteria) >= 2 and patient_diagnosis['primary_diagnosis'] == 'Нормальное течение беременности':
                patient_diagnosis['primary_diagnosis'] = 'Подозрение на ЗВУР'
                patient_diagnosis['secondary_diagnoses'] = '; '.join(iugr_criteria)
                patient_diagnosis['severity'] = 'Умеренная'
                patient_diagnosis['recommendations'] = 'УЗИ с допплерометрией, контроль роста плода'
            
            # 7. МНОЖЕСТВЕННЫЕ ПАТОЛОГИИ
            if len(patient_diagnosis['secondary_diagnoses']) >= 4:
                patient_diagnosis['primary_diagnosis'] = 'Множественные патологии беременности'
                patient_diagnosis['severity'] = 'Критическая'
                patient_diagnosis['recommendations'] = 'КОМПЛЕКСНОЕ ОБСЛЕДОВАНИЕ, консилиум специалистов'
            
            diagnoses.append(patient_diagnosis)
        
        self.patient_diagnoses = pd.DataFrame(diagnoses)
        
        # Статистика диагнозов
        print("Статистика диагнозов:")
        diagnosis_counts = self.patient_diagnoses['primary_diagnosis'].value_counts()
        for diagnosis, count in diagnosis_counts.items():
            percentage = (count / len(self.patient_diagnoses)) * 100
            print(f"  {diagnosis}: {count} пациенток ({percentage:.1f}%)")
        
        print("\nРаспределение по степени тяжести:")
        severity_counts = self.patient_diagnoses['severity'].value_counts()
        for severity, count in severity_counts.items():
            percentage = (count / len(self.patient_diagnoses)) * 100
            print(f"  {severity}: {count} пациенток ({percentage:.1f}%)")
        
        return self.patient_diagnoses
    
    def generate_detailed_patient_analysis(self):
        """
        Генерирует детальный анализ по каждой пациентке с диагнозами
        """
        print("\n" + "="*60)
        print("ДЕТАЛЬНЫЙ АНАЛИЗ ПО ПАЦИЕНТКАМ С ДИАГНОЗАМИ")
        print("="*60)
        
        # Объединяем все данные
        full_analysis = self.data.copy()
        full_analysis = pd.concat([full_analysis, self.patient_diagnoses], axis=1)
        
        # Группируем по диагнозам
        diagnosis_groups = full_analysis.groupby('primary_diagnosis')
        
        print("\nАНАЛИЗ ПО ГРУППАМ ДИАГНОЗОВ:")
        print("="*50)
        
        for diagnosis, group in diagnosis_groups:
            print(f"\n{diagnosis.upper()}")
            print("-" * len(diagnosis))
            print(f"Количество пациенток: {len(group)}")
            print(f"Средний возраст беременности: {group['baseline value'].mean():.1f} недель (по базовому ритму)")
            
            # Статистика по группе
            print(f"Средний базовый ритм: {group['baseline value'].mean():.1f} уд/мин")
            print(f"Средние ускорения: {group['accelerations'].mean():.4f}")
            print(f"Средние движения плода: {group['fetal_movement'].mean():.4f}")
            
            # Топ-5 пациенток в группе
            top_patients = group.head(5)
            print(f"\nТоп-5 пациенток в группе:")
            for idx, (_, patient) in enumerate(top_patients.iterrows(), 1):
                print(f"  {idx}. Пациентка #{patient['patient_id']}: "
                      f"тяжесть: {patient['severity']}")
        
        # Критические случаи
        critical_cases = full_analysis[full_analysis['severity'] == 'Критическая']
        print(f"\n\nКРИТИЧЕСКИЕ СЛУЧАИ (требуют немедленного вмешательства):")
        print("="*60)
        print(f"Всего критических случаев: {len(critical_cases)}")
        
        for idx, (_, patient) in enumerate(critical_cases.iterrows(), 1):
            print(f"\nКРИТИЧЕСКИЙ СЛУЧАЙ #{idx}")
            print(f"Пациентка: #{patient['patient_id']}")
            print(f"Диагноз: {patient['primary_diagnosis']}")
            print(f"Критерии: {patient['secondary_diagnoses']}")
            print(f"Рекомендации: {patient['recommendations']}")
        
        # Сохраняем полный анализ
        full_analysis.to_csv('detailed_patient_analysis_with_diagnoses.csv', index=False)
        print(f"\nПолный анализ с диагнозами сохранен в файл: detailed_patient_analysis_with_diagnoses.csv")
        
        return full_analysis
    
    def visualize_diagnosis_results(self):
        """
        Создает визуализации результатов диагностики
        """
        print("\n" + "="*60)
        print("СОЗДАНИЕ ВИЗУАЛИЗАЦИЙ РЕЗУЛЬТАТОВ ДИАГНОСТИКИ")
        print("="*60)
        
        # Объединяем данные
        full_analysis = self.data.copy()
        full_analysis = pd.concat([full_analysis, self.patient_diagnoses], axis=1)
        
        # 1. Распределение диагнозов
        plt.figure(figsize=(15, 10))
        
        # Круговая диаграмма диагнозов
        plt.subplot(2, 3, 1)
        diagnosis_counts = full_analysis['primary_diagnosis'].value_counts()
        colors = plt.cm.Set3(np.linspace(0, 1, len(diagnosis_counts)))
        plt.pie(diagnosis_counts.values, labels=diagnosis_counts.index, autopct='%1.1f%%', 
                colors=colors, startangle=90)
        plt.title('Распределение диагнозов', fontsize=12, fontweight='bold')
        
        # Столбчатая диаграмма диагнозов
        plt.subplot(2, 3, 2)
        diagnosis_counts.plot(kind='bar', color=colors)
        plt.title('Количество пациенток по диагнозам', fontsize=12, fontweight='bold')
        plt.xlabel('Диагноз')
        plt.ylabel('Количество пациенток')
        plt.xticks(rotation=45, ha='right')
        
        # Распределение по степени тяжести
        plt.subplot(2, 3, 3)
        severity_counts = full_analysis['severity'].value_counts()
        severity_colors = {'Норма': 'green', 'Умеренная': 'orange', 'Выраженная': 'red', 'Критическая': 'darkred'}
        colors_list = [severity_colors.get(severity, 'gray') for severity in severity_counts.index]
        plt.pie(severity_counts.values, labels=severity_counts.index, autopct='%1.1f%%', 
                colors=colors_list, startangle=90)
        plt.title('Распределение по степени тяжести', fontsize=12, fontweight='bold')
        
        # Связь диагнозов с базовыми параметрами
        plt.subplot(2, 3, 4)
        diagnosis_baseline = full_analysis.groupby('primary_diagnosis')['baseline value'].mean().sort_values(ascending=False)
        diagnosis_baseline.plot(kind='bar', color='skyblue', edgecolor='black')
        plt.title('Средний базовый ритм по диагнозам', fontsize=12, fontweight='bold')
        plt.xlabel('Диагноз')
        plt.ylabel('Базовый ритм (уд/мин)')
        plt.xticks(rotation=45, ha='right')
        
        # Связь диагнозов с ускорениями
        plt.subplot(2, 3, 5)
        diagnosis_accel = full_analysis.groupby('primary_diagnosis')['accelerations'].mean().sort_values(ascending=False)
        diagnosis_accel.plot(kind='bar', color='lightcoral', edgecolor='black')
        plt.title('Средние ускорения по диагнозам', fontsize=12, fontweight='bold')
        plt.xlabel('Диагноз')
        plt.ylabel('Ускорения')
        plt.xticks(rotation=45, ha='right')
        
        # Связь диагнозов с движениями плода
        plt.subplot(2, 3, 6)
        diagnosis_movement = full_analysis.groupby('primary_diagnosis')['fetal_movement'].mean().sort_values(ascending=False)
        diagnosis_movement.plot(kind='bar', color='lightgreen', edgecolor='black')
        plt.title('Средние движения плода по диагнозам', fontsize=12, fontweight='bold')
        plt.xlabel('Диагноз')
        plt.ylabel('Движения плода')
        plt.xticks(rotation=45, ha='right')
        
        plt.tight_layout()
        plt.savefig('diagnosis_analysis_overview.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        # 2. Детальный анализ критических случаев
        critical_cases = full_analysis[full_analysis['severity'] == 'Критическая']
        
        if len(critical_cases) > 0:
            plt.figure(figsize=(15, 10))
            
            # Распределение критических диагнозов
            plt.subplot(2, 3, 1)
            critical_diagnosis_counts = critical_cases['primary_diagnosis'].value_counts()
            plt.pie(critical_diagnosis_counts.values, labels=critical_diagnosis_counts.index, 
                   autopct='%1.1f%%', startangle=90, colors=plt.cm.Reds(np.linspace(0.3, 0.8, len(critical_diagnosis_counts))))
            plt.title('Распределение критических диагнозов', fontsize=12, fontweight='bold')
            
            # Базовый ритм у критических случаев
            plt.subplot(2, 3, 2)
            plt.hist(critical_cases['baseline value'], bins=20, alpha=0.7, color='red', edgecolor='black')
            plt.axvline(critical_cases['baseline value'].mean(), color='darkred', linestyle='--', linewidth=2, label=f'Среднее: {critical_cases["baseline value"].mean():.1f}')
            plt.title('Базовый ритм у критических случаев', fontsize=12, fontweight='bold')
            plt.xlabel('Базовый ритм (уд/мин)')
            plt.ylabel('Количество случаев')
            plt.legend()
            
            # Ускорения у критических случаев
            plt.subplot(2, 3, 3)
            plt.hist(critical_cases['accelerations'], bins=20, alpha=0.7, color='orange', edgecolor='black')
            plt.axvline(critical_cases['accelerations'].mean(), color='darkorange', linestyle='--', linewidth=2, label=f'Среднее: {critical_cases["accelerations"].mean():.4f}')
            plt.title('Ускорения у критических случаев', fontsize=12, fontweight='bold')
            plt.xlabel('Ускорения')
            plt.ylabel('Количество случаев')
            plt.legend()
            
            # Движения плода у критических случаев
            plt.subplot(2, 3, 4)
            plt.hist(critical_cases['fetal_movement'], bins=20, alpha=0.7, color='purple', edgecolor='black')
            plt.axvline(critical_cases['fetal_movement'].mean(), color='darkviolet', linestyle='--', linewidth=2, label=f'Среднее: {critical_cases["fetal_movement"].mean():.4f}')
            plt.title('Движения плода у критических случаев', fontsize=12, fontweight='bold')
            plt.xlabel('Движения плода')
            plt.ylabel('Количество случаев')
            plt.legend()
            
            # Аномальная вариабельность у критических случаев
            plt.subplot(2, 3, 5)
            plt.hist(critical_cases['abnormal_short_term_variability'], bins=20, alpha=0.7, color='brown', edgecolor='black')
            plt.axvline(critical_cases['abnormal_short_term_variability'].mean(), color='darkred', linestyle='--', linewidth=2, label=f'Среднее: {critical_cases["abnormal_short_term_variability"].mean():.1f}')
            plt.title('Аномальная краткосрочная вариабельность', fontsize=12, fontweight='bold')
            plt.xlabel('Аномальная вариабельность')
            plt.ylabel('Количество случаев')
            plt.legend()
            
            # Децелерации у критических случаев
            plt.subplot(2, 3, 6)
            severe_decel = critical_cases['severe_decelerations']
            prolongued_decel = critical_cases['prolongued_decelerations']
            plt.scatter(severe_decel, prolongued_decel, alpha=0.6, c='red', s=50)
            plt.xlabel('Выраженные децелерации')
            plt.ylabel('Пролонгированные децелерации')
            plt.title('Децелерации у критических случаев', fontsize=12, fontweight='bold')
            
            plt.tight_layout()
            plt.savefig('critical_cases_analysis.png', dpi=300, bbox_inches='tight')
            plt.show()
        
        # 3. Тепловая карта параметров по диагнозам
        plt.figure(figsize=(16, 10))
        
        # Выбираем ключевые параметры для анализа
        key_params = ['baseline value', 'accelerations', 'fetal_movement', 'uterine_contractions',
                     'abnormal_short_term_variability', 'mean_value_of_short_term_variability',
                     'percentage_of_time_with_abnormal_long_term_variability', 'mean_value_of_long_term_variability']
        
        # Создаем матрицу средних значений параметров по диагнозам
        diagnosis_params = full_analysis.groupby('primary_diagnosis')[key_params].mean()
        
        # Нормализуем данные для лучшей визуализации
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        diagnosis_params_scaled = pd.DataFrame(
            scaler.fit_transform(diagnosis_params),
            index=diagnosis_params.index,
            columns=diagnosis_params.columns
        )
        
        # Создаем тепловую карту
        sns.heatmap(diagnosis_params_scaled.T, annot=True, cmap='RdYlBu_r', center=0,
                   cbar_kws={'label': 'Нормализованное значение'}, fmt='.2f')
        plt.title('Тепловая карта параметров по диагнозам', fontsize=14, fontweight='bold')
        plt.xlabel('Диагноз')
        plt.ylabel('Параметры')
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        
        plt.tight_layout()
        plt.savefig('diagnosis_parameters_heatmap.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        # 4. Сравнение с исходными классами fetal_health
        plt.figure(figsize=(12, 8))
        
        # Создаем кросс-таблицу
        cross_tab = pd.crosstab(full_analysis['fetal_health'], full_analysis['primary_diagnosis'])
        
        # Визуализируем
        sns.heatmap(cross_tab, annot=True, fmt='d', cmap='Blues', 
                   cbar_kws={'label': 'Количество пациенток'})
        plt.title('Сравнение исходных классов с диагнозами', fontsize=14, fontweight='bold')
        plt.xlabel('Диагноз')
        plt.ylabel('Исходный класс fetal_health')
        
        plt.tight_layout()
        plt.savefig('fetal_health_vs_diagnosis_comparison.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print(f"\nСозданы визуализации:")
        print(f"  - diagnosis_analysis_overview.png - общий обзор диагнозов")
        print(f"  - critical_cases_analysis.png - анализ критических случаев")
        print(f"  - diagnosis_parameters_heatmap.png - тепловая карта параметров")
        print(f"  - fetal_health_vs_diagnosis_comparison.png - сравнение с исходными классами")
        
        return full_analysis
    
    def visualize_individual_patients(self, n_patients=20):
        """
        Создает простую визуализацию пациенток с их диагнозами
        """
        print("\n=== ВИЗУАЛИЗАЦИЯ ИНДИВИДУАЛЬНЫХ ПАЦИЕНТОК ===")
        
        # Загружаем данные с диагнозами
        df_with_diagnoses = pd.read_csv('detailed_patient_analysis_with_diagnoses.csv')
        
        # Получаем уникальные диагнозы
        unique_diagnoses = df_with_diagnoses['primary_diagnosis'].unique()
        print(f"Найдено {len(unique_diagnoses)} уникальных диагнозов")
        
        # Выбираем пациенток для визуализации (по 2-3 с каждым диагнозом)
        selected_patients = []
        patients_per_diagnosis = max(1, n_patients // len(unique_diagnoses))
        
        for diagnosis in unique_diagnoses:
            diagnosis_patients = df_with_diagnoses[df_with_diagnoses['primary_diagnosis'] == diagnosis]
            if len(diagnosis_patients) >= patients_per_diagnosis:
                selected = diagnosis_patients.sample(patients_per_diagnosis)
            else:
                selected = diagnosis_patients
            selected_patients.append(selected)
        
        # Объединяем выбранных пациенток
        df_selected = pd.concat(selected_patients, ignore_index=True)
        
        # Если получилось больше чем нужно, берем первые n_patients
        if len(df_selected) > n_patients:
            df_selected = df_selected.head(n_patients)
        
        print(f"Выбрано {len(df_selected)} пациенток для визуализации")
        
        # Создаем простую визуализацию - список ID и диагнозов
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Подготавливаем данные для отображения
        patient_data = df_selected[['patient_id', 'primary_diagnosis', 'severity']].copy()
        patient_data = patient_data.sort_values(['severity', 'primary_diagnosis'], 
                                              key=lambda x: x.map({'Критическая': 4, 'Выраженная': 3, 
                                                                 'Умеренная': 2, 'Норма': 1}))
        
        # Создаем текст для отображения
        y_positions = []
        texts = []
        colors = []
        
        severity_colors = {'Норма': 'green', 'Умеренная': 'orange', 'Выраженная': 'red', 'Критическая': 'darkred'}
        
        for i, (_, row) in enumerate(patient_data.iterrows()):
            y_positions.append(i)
            text = f"ID {row['patient_id']} - {row['primary_diagnosis']} ({row['severity']})"
            texts.append(text)
            colors.append(severity_colors.get(row['severity'], 'gray'))
        
        # Отображаем данные
        for i, (y, text, color) in enumerate(zip(y_positions, texts, colors)):
            ax.text(0.1, y, text, fontsize=10, color=color, fontweight='bold',
                   verticalalignment='center', transform=ax.transData)
        
        # Настройки графика
        ax.set_xlim(0, 1)
        ax.set_ylim(-0.5, len(patient_data) - 0.5)
        ax.set_title('Пациентки и их диагнозы', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('ID Пациентки - Диагноз (Тяжесть)', fontsize=12)
        ax.set_ylabel('Номер записи', fontsize=12)
        
        # Убираем оси
        ax.set_xticks([])
        ax.set_yticks(range(len(patient_data)))
        ax.set_yticklabels([f"{i+1}" for i in range(len(patient_data))])
        
        # Добавляем сетку
        ax.grid(True, alpha=0.3, axis='y')
        
        # Добавляем легенду
        legend_elements = [plt.Rectangle((0,0),1,1, facecolor=color, label=severity) 
                          for severity, color in severity_colors.items()]
        ax.legend(handles=legend_elements, loc='upper right', title='Тяжесть')
        
        plt.tight_layout()
        plt.savefig('patients_diagnoses_list.png', dpi=300, bbox_inches='tight')
        plt.show()
        print("Сохранена визуализация списка пациенток: patients_diagnoses_list.png")
        
        # Выводим информацию в консоль
        print("\n=== СПИСОК ПАЦИЕНТОК С ДИАГНОЗАМИ ===")
        for i, (_, row) in enumerate(patient_data.iterrows(), 1):
            print(f"{i:2d}. ID {row['patient_id']:4d} - {row['primary_diagnosis']:30s} ({row['severity']:10s})")
        
        # Сохраняем в CSV
        patient_data.to_csv('selected_patients_simple.csv', index=False, encoding='utf-8')
        print(f"\nСписок сохранен в: selected_patients_simple.csv")
        
        return df_selected
    
    def generate_detailed_diagnosis_report(self, patient_ids=None):
        """
        Создает детальный отчет с полными диагнозами, критериями и рекомендациями
        """
        print("\n=== ДЕТАЛЬНЫЙ ОТЧЕТ ПО ДИАГНОЗАМ ===")
        
        # Загружаем полные данные с диагнозами
        df_with_diagnoses = pd.read_csv('detailed_patient_analysis_with_diagnoses.csv')
        
        # Если не указаны конкретные ID, берем из selected_patients_simple.csv
        if patient_ids is None:
            selected_df = pd.read_csv('selected_patients_simple.csv')
            patient_ids = selected_df['patient_id'].tolist()
        
        # Фильтруем данные по выбранным пациенткам
        detailed_data = df_with_diagnoses[df_with_diagnoses['patient_id'].isin(patient_ids)]
        
        # Сортируем по тяжести и ID
        detailed_data = detailed_data.sort_values(['severity', 'patient_id'], 
                                                key=lambda x: x.map({'Критическая': 4, 'Выраженная': 3, 
                                                                   'Умеренная': 2, 'Норма': 1}))
        
        print(f"Детальный анализ для {len(detailed_data)} пациенток:")
        print("="*80)
        
        for idx, (_, patient) in enumerate(detailed_data.iterrows(), 1):
            print(f"\n{'='*80}")
            print(f"ПАЦИЕНТКА #{idx}: ID {patient['patient_id']}")
            print(f"{'='*80}")
            
            print(f"ОСНОВНОЙ ДИАГНОЗ: {patient['primary_diagnosis']}")
            print(f"СТЕПЕНЬ ТЯЖЕСТИ: {patient['severity']}")
            
            if patient['secondary_diagnoses'] and pd.notna(patient['secondary_diagnoses']):
                print(f"\nКРИТЕРИИ ДИАГНОСТИКИ:")
                criteria = str(patient['secondary_diagnoses']).split('; ')
                for i, criterion in enumerate(criteria, 1):
                    print(f"  {i}. {criterion}")
            
            print(f"\nРЕКОМЕНДАЦИИ: {patient['recommendations']}")
            
            print(f"\nКЛЮЧЕВЫЕ ПАРАМЕТРЫ:")
            print(f"  • Базовый ритм сердца: {patient['baseline value']:.1f} уд/мин")
            print(f"  • Ускорения: {patient['accelerations']:.4f}")
            print(f"  • Движения плода: {patient['fetal_movement']:.4f}")
            print(f"  • Тяжелые децелерации: {patient['severe_decelerations']:.4f}")
            print(f"  • Пролонгированные децелерации: {patient['prolongued_decelerations']:.4f}")
            print(f"  • Аномальная краткосрочная вариабельность: {patient['abnormal_short_term_variability']:.1f}%")
            print(f"  • Средняя краткосрочная вариабельность: {patient['mean_value_of_short_term_variability']:.2f}")
            print(f"  • Аномальная долгосрочная вариабельность: {patient['percentage_of_time_with_abnormal_long_term_variability']:.1f}% времени")
            print(f"  • Средняя долгосрочная вариабельность: {patient['mean_value_of_long_term_variability']:.2f}")
            print(f"  • Сокращения матки: {patient['uterine_contractions']:.4f}")
            
            # Дополнительные параметры гистограммы
            print(f"\nПАРАМЕТРЫ ГИСТОГРАММЫ:")
            print(f"  • Ширина гистограммы: {patient['histogram_width']:.1f}")
            print(f"  • Минимальное значение: {patient['histogram_min']:.1f}")
            print(f"  • Максимальное значение: {patient['histogram_max']:.1f}")
            print(f"  • Количество пиков: {patient['histogram_number_of_peaks']:.0f}")
            print(f"  • Количество нулей: {patient['histogram_number_of_zeroes']:.0f}")
            print(f"  • Мода: {patient['histogram_mode']:.1f}")
            print(f"  • Среднее значение: {patient['histogram_mean']:.1f}")
            print(f"  • Медиана: {patient['histogram_median']:.1f}")
            print(f"  • Дисперсия: {patient['histogram_variance']:.1f}")
            print(f"  • Тенденция: {patient['histogram_tendency']:.1f}")
            
            # Оценка риска
            risk_level = "НИЗКИЙ"
            if patient['severity'] == 'Критическая':
                risk_level = "КРИТИЧЕСКИЙ"
            elif patient['severity'] == 'Выраженная':
                risk_level = "ВЫСОКИЙ"
            elif patient['severity'] == 'Умеренная':
                risk_level = "УМЕРЕННЫЙ"
            
            print(f"\nОБЩАЯ ОЦЕНКА РИСКА: {risk_level}")
            
            # Специфические рекомендации по диагнозу
            if patient['primary_diagnosis'] == 'Нормальное течение беременности':
                print(f"\nДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ:")
                print(f"  • Продолжить плановое наблюдение")
                print(f"  • Регулярные КТГ-исследования")
                print(f"  • Контроль веса и артериального давления")
                print(f"  • Соблюдение режима дня и питания")
            elif 'Множественные патологии' in patient['primary_diagnosis']:
                print(f"\nДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ:")
                print(f"  • Немедленная госпитализация в специализированный центр")
                print(f"  • Консилиум врачей: акушер-гинеколог, неонатолог, кардиолог")
                print(f"  • Ежедневный мониторинг состояния плода")
                print(f"  • Подготовка к возможному экстренному родоразрешению")
                print(f"  • Дополнительные исследования: УЗИ, допплерометрия, биохимические анализы")
        
        # Создаем сводную статистику
        print(f"\n{'='*80}")
        print(f"СВОДНАЯ СТАТИСТИКА ПО ВЫБРАННЫМ ПАЦИЕНТКАМ")
        print(f"{'='*80}")
        
        diagnosis_counts = detailed_data['primary_diagnosis'].value_counts()
        print(f"\nРаспределение по диагнозам:")
        for diagnosis, count in diagnosis_counts.items():
            percentage = (count / len(detailed_data)) * 100
            print(f"  • {diagnosis}: {count} пациенток ({percentage:.1f}%)")
        
        severity_counts = detailed_data['severity'].value_counts()
        print(f"\nРаспределение по тяжести:")
        for severity, count in severity_counts.items():
            percentage = (count / len(detailed_data)) * 100
            print(f"  • {severity}: {count} пациенток ({percentage:.1f}%)")
        
        # Критические случаи
        critical_cases = detailed_data[detailed_data['severity'] == 'Критическая']
        if len(critical_cases) > 0:
            print(f"\nКРИТИЧЕСКИЕ СЛУЧАИ (требуют немедленного вмешательства):")
            for _, patient in critical_cases.iterrows():
                print(f"  • ID {patient['patient_id']}: {patient['primary_diagnosis']}")
        
        # Сохраняем детальный отчет в файл
        detailed_report = detailed_data[['patient_id', 'primary_diagnosis', 'secondary_diagnoses', 
                                       'severity', 'recommendations', 'baseline value', 'accelerations', 
                                       'fetal_movement', 'severe_decelerations', 'prolongued_decelerations',
                                       'abnormal_short_term_variability', 'mean_value_of_short_term_variability',
                                       'percentage_of_time_with_abnormal_long_term_variability', 
                                       'mean_value_of_long_term_variability', 'uterine_contractions']].copy()
        
        detailed_report.to_csv('detailed_diagnosis_report.csv', index=False, encoding='utf-8')
        print(f"\nДетальный отчет сохранен в: detailed_diagnosis_report.csv")
        
        return detailed_data
    
    def visualize_detailed_report(self, csv_file='detailed_diagnosis_report.csv'):
        """
        Создает визуализацию данных из детального отчета
        """
        print("\n=== ВИЗУАЛИЗАЦИЯ ДЕТАЛЬНОГО ОТЧЕТА ===")
        
        # Загружаем данные
        df = pd.read_csv(csv_file)
        print(f"Загружено {len(df)} записей из {csv_file}")
        
        # Создаем фигуру с несколькими подграфиками
        fig = plt.figure(figsize=(20, 24))
        
        # 1. Распределение по диагнозам (круговая диаграмма)
        ax1 = plt.subplot(4, 3, 1)
        diagnosis_counts = df['primary_diagnosis'].value_counts()
        colors = ['lightgreen', 'red']
        wedges, texts, autotexts = ax1.pie(diagnosis_counts.values, 
                                          labels=diagnosis_counts.index, 
                                          autopct='%1.1f%%',
                                          colors=colors,
                                          startangle=90)
        ax1.set_title('Распределение по диагнозам', fontsize=14, fontweight='bold')
        
        # 2. Распределение по тяжести (столбчатая диаграмма)
        ax2 = plt.subplot(4, 3, 2)
        severity_counts = df['severity'].value_counts()
        severity_colors = {'Норма': 'green', 'Умеренная': 'orange', 'Выраженная': 'red', 'Критическая': 'darkred'}
        bars = ax2.bar(severity_counts.index, severity_counts.values, 
                      color=[severity_colors.get(x, 'gray') for x in severity_counts.index])
        ax2.set_title('Распределение по тяжести', fontsize=14, fontweight='bold')
        ax2.set_ylabel('Количество пациенток')
        plt.setp(ax2.get_xticklabels(), rotation=45)
        
        # 3. Базовый ритм сердца по диагнозам (боксплот)
        ax3 = plt.subplot(4, 3, 3)
        df.boxplot(column='baseline value', by='primary_diagnosis', ax=ax3)
        ax3.set_title('Базовый ритм сердца по диагнозам', fontsize=14, fontweight='bold')
        ax3.set_xlabel('Диагноз')
        ax3.set_ylabel('Базовый ритм (уд/мин)')
        plt.setp(ax3.get_xticklabels(), rotation=45)
        
        # 4. Ускорения по диагнозам
        ax4 = plt.subplot(4, 3, 4)
        df.boxplot(column='accelerations', by='primary_diagnosis', ax=ax4)
        ax4.set_title('Ускорения по диагнозам', fontsize=14, fontweight='bold')
        ax4.set_xlabel('Диагноз')
        ax4.set_ylabel('Ускорения')
        plt.setp(ax4.get_xticklabels(), rotation=45)
        
        # 5. Движения плода по диагнозам
        ax5 = plt.subplot(4, 3, 5)
        df.boxplot(column='fetal_movement', by='primary_diagnosis', ax=ax5)
        ax5.set_title('Движения плода по диагнозам', fontsize=14, fontweight='bold')
        ax5.set_xlabel('Диагноз')
        ax5.set_ylabel('Движения плода')
        plt.setp(ax5.get_xticklabels(), rotation=45)
        
        # 6. Аномальная краткосрочная вариабельность
        ax6 = plt.subplot(4, 3, 6)
        df.boxplot(column='abnormal_short_term_variability', by='primary_diagnosis', ax=ax6)
        ax6.set_title('Аномальная краткосрочная вариабельность', fontsize=14, fontweight='bold')
        ax6.set_xlabel('Диагноз')
        ax6.set_ylabel('Процент аномальной вариабельности')
        plt.setp(ax6.get_xticklabels(), rotation=45)
        
        # 7. Аномальная долгосрочная вариабельность
        ax7 = plt.subplot(4, 3, 7)
        df.boxplot(column='percentage_of_time_with_abnormal_long_term_variability', by='primary_diagnosis', ax=ax7)
        ax7.set_title('Аномальная долгосрочная вариабельность', fontsize=14, fontweight='bold')
        ax7.set_xlabel('Диагноз')
        ax7.set_ylabel('Процент времени с аномальной вариабельностью')
        plt.setp(ax7.get_xticklabels(), rotation=45)
        
        # 8. Средняя краткосрочная вариабельность
        ax8 = plt.subplot(4, 3, 8)
        df.boxplot(column='mean_value_of_short_term_variability', by='primary_diagnosis', ax=ax8)
        ax8.set_title('Средняя краткосрочная вариабельность', fontsize=14, fontweight='bold')
        ax8.set_xlabel('Диагноз')
        ax8.set_ylabel('Средняя краткосрочная вариабельность')
        plt.setp(ax8.get_xticklabels(), rotation=45)
        
        # 9. Средняя долгосрочная вариабельность
        ax9 = plt.subplot(4, 3, 9)
        df.boxplot(column='mean_value_of_long_term_variability', by='primary_diagnosis', ax=ax9)
        ax9.set_title('Средняя долгосрочная вариабельность', fontsize=14, fontweight='bold')
        ax9.set_xlabel('Диагноз')
        ax9.set_ylabel('Средняя долгосрочная вариабельность')
        plt.setp(ax9.get_xticklabels(), rotation=45)
        
        # 10. Корреляционная матрица ключевых параметров
        ax10 = plt.subplot(4, 3, 10)
        numeric_cols = ['baseline value', 'accelerations', 'fetal_movement', 
                       'abnormal_short_term_variability', 'mean_value_of_short_term_variability',
                       'percentage_of_time_with_abnormal_long_term_variability', 
                       'mean_value_of_long_term_variability']
        corr_matrix = df[numeric_cols].corr()
        im = ax10.imshow(corr_matrix, cmap='coolwarm', aspect='auto', vmin=-1, vmax=1)
        ax10.set_xticks(range(len(numeric_cols)))
        ax10.set_yticks(range(len(numeric_cols)))
        ax10.set_xticklabels([col.replace('_', '\n') for col in numeric_cols], rotation=45, ha='right')
        ax10.set_yticklabels([col.replace('_', '\n') for col in numeric_cols])
        ax10.set_title('Корреляция параметров', fontsize=14, fontweight='bold')
        
        # Добавляем значения корреляции
        for i in range(len(numeric_cols)):
            for j in range(len(numeric_cols)):
                text = ax10.text(j, i, f'{corr_matrix.iloc[i, j]:.2f}',
                               ha="center", va="center", color="black", fontsize=8)
        
        # Добавляем цветовую шкалу
        plt.colorbar(im, ax=ax10, shrink=0.8)
        
        # 11. Сравнение критических случаев
        ax11 = plt.subplot(4, 3, 11)
        critical_cases = df[df['severity'] == 'Критическая']
        normal_cases = df[df['severity'] == 'Норма']
        
        # Создаем сравнительную диаграмму
        comparison_data = {
            'Базовый ритм': [normal_cases['baseline value'].mean(), critical_cases['baseline value'].mean()],
            'Ускорения': [normal_cases['accelerations'].mean(), critical_cases['accelerations'].mean()],
            'Движения плода': [normal_cases['fetal_movement'].mean(), critical_cases['fetal_movement'].mean()],
            'Аном. краткосрочная вариабельность': [normal_cases['abnormal_short_term_variability'].mean(), 
                                                  critical_cases['abnormal_short_term_variability'].mean()]
        }
        
        x = np.arange(len(comparison_data))
        width = 0.35
        
        ax11.bar(x - width/2, [comparison_data[key][0] for key in comparison_data.keys()], 
                width, label='Норма', color='green', alpha=0.7)
        ax11.bar(x + width/2, [comparison_data[key][1] for key in comparison_data.keys()], 
                width, label='Критическая', color='red', alpha=0.7)
        
        ax11.set_xlabel('Параметры')
        ax11.set_ylabel('Средние значения')
        ax11.set_title('Сравнение нормальных и критических случаев', fontsize=14, fontweight='bold')
        ax11.set_xticks(x)
        ax11.set_xticklabels([key.replace(' ', '\n') for key in comparison_data.keys()], rotation=45)
        ax11.legend()
        
        # 12. Тепловая карта пациенток
        ax12 = plt.subplot(4, 3, 12)
        
        # Подготавливаем данные для тепловой карты
        heatmap_data = df[['baseline value', 'accelerations', 'fetal_movement', 
                          'abnormal_short_term_variability', 'mean_value_of_short_term_variability',
                          'percentage_of_time_with_abnormal_long_term_variability', 
                          'mean_value_of_long_term_variability']].T
        
        # Нормализуем данные для лучшей визуализации
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        heatmap_data_scaled = pd.DataFrame(scaler.fit_transform(heatmap_data.T).T,
                                         columns=heatmap_data.columns,
                                         index=heatmap_data.index)
        
        im = ax12.imshow(heatmap_data_scaled, cmap='RdYlBu_r', aspect='auto')
        ax12.set_xticks(range(len(df)))
        ax12.set_xticklabels([f"ID {pid}" for pid in df['patient_id']], rotation=90)
        ax12.set_yticks(range(len(heatmap_data_scaled.index)))
        ax12.set_yticklabels([col.replace('_', '\n') for col in heatmap_data_scaled.index])
        ax12.set_title('Тепловая карта параметров пациенток', fontsize=14, fontweight='bold')
        
        # Добавляем цветовую шкалу
        plt.colorbar(im, ax=ax12, shrink=0.8)
        
        plt.tight_layout()
        plt.savefig('detailed_report_visualization.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Сохранена визуализация детального отчета: detailed_report_visualization.png")
        
        # Создаем дополнительную визуализацию - детальный анализ критических случаев
        self._create_critical_cases_analysis(df)
        
        return df
    
    def _create_critical_cases_analysis(self, df):
        """
        Создает детальный анализ критических случаев
        """
        print("\n=== АНАЛИЗ КРИТИЧЕСКИХ СЛУЧАЕВ ===")
        
        critical_cases = df[df['severity'] == 'Критическая']
        normal_cases = df[df['severity'] == 'Норма']
        
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        
        # 1. Сравнение базового ритма
        axes[0, 0].hist(normal_cases['baseline value'], alpha=0.7, label='Норма', color='green', bins=10)
        axes[0, 0].hist(critical_cases['baseline value'], alpha=0.7, label='Критическая', color='red', bins=10)
        axes[0, 0].set_title('Распределение базового ритма сердца')
        axes[0, 0].set_xlabel('Базовый ритм (уд/мин)')
        axes[0, 0].set_ylabel('Количество')
        axes[0, 0].legend()
        
        # 2. Сравнение ускорений
        axes[0, 1].hist(normal_cases['accelerations'], alpha=0.7, label='Норма', color='green', bins=10)
        axes[0, 1].hist(critical_cases['accelerations'], alpha=0.7, label='Критическая', color='red', bins=10)
        axes[0, 1].set_title('Распределение ускорений')
        axes[0, 1].set_xlabel('Ускорения')
        axes[0, 1].set_ylabel('Количество')
        axes[0, 1].legend()
        
        # 3. Сравнение движений плода
        axes[0, 2].hist(normal_cases['fetal_movement'], alpha=0.7, label='Норма', color='green', bins=10)
        axes[0, 2].hist(critical_cases['fetal_movement'], alpha=0.7, label='Критическая', color='red', bins=10)
        axes[0, 2].set_title('Распределение движений плода')
        axes[0, 2].set_xlabel('Движения плода')
        axes[0, 2].set_ylabel('Количество')
        axes[0, 2].legend()
        
        # 4. Сравнение аномальной краткосрочной вариабельности
        axes[1, 0].hist(normal_cases['abnormal_short_term_variability'], alpha=0.7, label='Норма', color='green', bins=10)
        axes[1, 0].hist(critical_cases['abnormal_short_term_variability'], alpha=0.7, label='Критическая', color='red', bins=10)
        axes[1, 0].set_title('Аномальная краткосрочная вариабельность')
        axes[1, 0].set_xlabel('Процент аномальной вариабельности')
        axes[1, 0].set_ylabel('Количество')
        axes[1, 0].legend()
        
        # 5. Сравнение аномальной долгосрочной вариабельности
        axes[1, 1].hist(normal_cases['percentage_of_time_with_abnormal_long_term_variability'], alpha=0.7, label='Норма', color='green', bins=10)
        axes[1, 1].hist(critical_cases['percentage_of_time_with_abnormal_long_term_variability'], alpha=0.7, label='Критическая', color='red', bins=10)
        axes[1, 1].set_title('Аномальная долгосрочная вариабельность')
        axes[1, 1].set_xlabel('Процент времени с аномальной вариабельностью')
        axes[1, 1].set_ylabel('Количество')
        axes[1, 1].legend()
        
        # 6. Сравнение средней краткосрочной вариабельности
        axes[1, 2].hist(normal_cases['mean_value_of_short_term_variability'], alpha=0.7, label='Норма', color='green', bins=10)
        axes[1, 2].hist(critical_cases['mean_value_of_short_term_variability'], alpha=0.7, label='Критическая', color='red', bins=10)
        axes[1, 2].set_title('Средняя краткосрочная вариабельность')
        axes[1, 2].set_xlabel('Средняя краткосрочная вариабельность')
        axes[1, 2].set_ylabel('Количество')
        axes[1, 2].legend()
        
        plt.tight_layout()
        plt.savefig('critical_cases_detailed_analysis.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Сохранен детальный анализ критических случаев: critical_cases_detailed_analysis.png")
        
        # Статистический анализ
        print(f"\nСтатистика по критическим случаям:")
        print(f"Количество критических случаев: {len(critical_cases)}")
        print(f"Количество нормальных случаев: {len(normal_cases)}")
        
        print(f"\nСредние значения для нормальных случаев:")
        for col in ['baseline value', 'accelerations', 'fetal_movement', 
                   'abnormal_short_term_variability', 'mean_value_of_short_term_variability',
                   'percentage_of_time_with_abnormal_long_term_variability']:
            print(f"  {col}: {normal_cases[col].mean():.3f}")
        
        print(f"\nСредние значения для критических случаев:")
        for col in ['baseline value', 'accelerations', 'fetal_movement', 
                   'abnormal_short_term_variability', 'mean_value_of_short_term_variability',
                   'percentage_of_time_with_abnormal_long_term_variability']:
            print(f"  {col}: {critical_cases[col].mean():.3f}")
    
    def create_patients_table(self, csv_file='detailed_diagnosis_report.csv'):
        """
        Создает простую таблицу пациентов в формате: ID, диагноз, критерии, тяжесть, рекомендации
        """
        print("\n=== СОЗДАНИЕ ТАБЛИЦЫ ПАЦИЕНТОВ ===")
        
        # Загружаем данные
        df = pd.read_csv(csv_file)
        print(f"Загружено {len(df)} записей из {csv_file}")
        
        # Создаем таблицу в нужном формате
        patients_table = df[['patient_id', 'primary_diagnosis', 'secondary_diagnoses', 'severity', 'recommendations']].copy()
        
        # Заполняем пустые критерии
        patients_table['secondary_diagnoses'] = patients_table['secondary_diagnoses'].fillna('')
        
        # Сортируем по тяжести и ID
        severity_order = {'Норма': 1, 'Умеренная': 2, 'Выраженная': 3, 'Критическая': 4}
        patients_table['severity_order'] = patients_table['severity'].map(severity_order)
        patients_table = patients_table.sort_values(['severity_order', 'patient_id']).drop('severity_order', axis=1)
        
        # Сохраняем в CSV
        patients_table.to_csv('patients_table.csv', index=False, encoding='utf-8')
        print("Таблица пациентов сохранена в: patients_table.csv")
        
        # Выводим таблицу на экран
        print("\n=== ТАБЛИЦА ПАЦИЕНТОВ ===")
        print("ID | Диагноз | Критерии | Тяжесть | Рекомендации")
        print("-" * 120)
        
        for _, row in patients_table.iterrows():
            # Ограничиваем длину критериев для лучшего отображения
            criteria = str(row['secondary_diagnoses'])[:50] + "..." if len(str(row['secondary_diagnoses'])) > 50 else str(row['secondary_diagnoses'])
            recommendations = str(row['recommendations'])[:30] + "..." if len(str(row['recommendations'])) > 30 else str(row['recommendations'])
            
            print(f"{row['patient_id']:3d} | {row['primary_diagnosis']:30s} | {criteria:50s} | {row['severity']:10s} | {recommendations}")
        
        # Создаем также упрощенную версию без критериев
        simple_table = patients_table[['patient_id', 'primary_diagnosis', 'severity', 'recommendations']].copy()
        simple_table.to_csv('patients_simple_table.csv', index=False, encoding='utf-8')
        print("\nУпрощенная таблица сохранена в: patients_simple_table.csv")
        
        # Выводим упрощенную таблицу
        print("\n=== УПРОЩЕННАЯ ТАБЛИЦА ПАЦИЕНТОВ ===")
        print("ID | Диагноз | Тяжесть | Рекомендации")
        print("-" * 80)
        
        for _, row in simple_table.iterrows():
            recommendations = str(row['recommendations'])[:40] + "..." if len(str(row['recommendations'])) > 40 else str(row['recommendations'])
            print(f"{row['patient_id']:3d} | {row['primary_diagnosis']:30s} | {row['severity']:10s} | {recommendations}")
        
        # Статистика по таблице
        print(f"\n=== СТАТИСТИКА ТАБЛИЦЫ ===")
        print(f"Всего пациентов: {len(patients_table)}")
        
        diagnosis_counts = patients_table['primary_diagnosis'].value_counts()
        print(f"\nПо диагнозам:")
        for diagnosis, count in diagnosis_counts.items():
            print(f"  • {diagnosis}: {count} пациентов")
        
        severity_counts = patients_table['severity'].value_counts()
        print(f"\nПо тяжести:")
        for severity, count in severity_counts.items():
            print(f"  • {severity}: {count} пациентов")
        
        return patients_table
    
    def visualize_patients_table(self, csv_file='patients_table.csv'):
        """
        Создает визуализацию таблицы пациентов
        """
        print("\n=== ВИЗУАЛИЗАЦИЯ ТАБЛИЦЫ ПАЦИЕНТОВ ===")
        
        # Загружаем данные
        df = pd.read_csv(csv_file)
        print(f"Загружено {len(df)} записей из {csv_file}")
        
        # Создаем фигуру с таблицей
        fig, ax = plt.subplots(figsize=(20, 12))
        ax.axis('tight')
        ax.axis('off')
        
        # Подготавливаем данные для таблицы
        table_data = []
        for _, row in df.iterrows():
            # Ограничиваем длину критериев для лучшего отображения
            criteria = str(row['secondary_diagnoses'])[:60] + "..." if len(str(row['secondary_diagnoses'])) > 60 else str(row['secondary_diagnoses'])
            recommendations = str(row['recommendations'])[:40] + "..." if len(str(row['recommendations'])) > 40 else str(row['recommendations'])
            
            table_data.append([
                f"ID {row['patient_id']}",
                row['primary_diagnosis'][:30] + "..." if len(row['primary_diagnosis']) > 30 else row['primary_diagnosis'],
                criteria,
                row['severity'],
                recommendations
            ])
        
        # Создаем таблицу
        table = ax.table(cellText=table_data,
                        colLabels=['ID', 'Диагноз', 'Критерии', 'Тяжесть', 'Рекомендации'],
                        cellLoc='left',
                        loc='center',
                        bbox=[0, 0, 1, 1])
        
        # Настраиваем стиль таблицы
        table.auto_set_font_size(False)
        table.set_fontsize(9)
        table.scale(1, 2)
        
        # Цветовое кодирование по тяжести
        for i in range(len(table_data) + 1):
            for j in range(5):
                cell = table[(i, j)]
                if i == 0:  # Заголовок
                    cell.set_facecolor('#4CAF50')
                    cell.set_text_props(weight='bold', color='white')
                else:
                    # Цветовое кодирование по тяжести
                    severity = table_data[i-1][3]
                    if severity == 'Норма':
                        cell.set_facecolor('#E8F5E8')
                    elif severity == 'Умеренная':
                        cell.set_facecolor('#FFF3CD')
                    elif severity == 'Выраженная':
                        cell.set_facecolor('#F8D7DA')
                    elif severity == 'Критическая':
                        cell.set_facecolor('#F5C6CB')
                    
                    # Выделяем ID
                    if j == 0:
                        cell.set_text_props(weight='bold')
        
        # Настраиваем высоту строк
        for i in range(len(table_data) + 1):
            table[(i, 0)].set_height(0.08)
            table[(i, 1)].set_height(0.08)
            table[(i, 2)].set_height(0.08)
            table[(i, 3)].set_height(0.08)
            table[(i, 4)].set_height(0.08)
        
        plt.title('ТАБЛИЦА ПАЦИЕНТОВ С ДИАГНОЗАМИ', fontsize=16, fontweight='bold', pad=20)
        
        # Добавляем легенду
        legend_elements = [
            plt.Rectangle((0,0),1,1, facecolor='#E8F5E8', label='Норма'),
            plt.Rectangle((0,0),1,1, facecolor='#FFF3CD', label='Умеренная'),
            plt.Rectangle((0,0),1,1, facecolor='#F8D7DA', label='Выраженная'),
            plt.Rectangle((0,0),1,1, facecolor='#F5C6CB', label='Критическая')
        ]
        ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 0.9))
        
        plt.tight_layout()
        plt.savefig('patients_table_visualization.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Сохранена визуализация таблицы: patients_table_visualization.png")
        
        # Создаем также упрощенную визуализацию
        self._create_simple_table_visualization(df)
        
        return df
    
    def _create_simple_table_visualization(self, df):
        """
        Создает упрощенную визуализацию таблицы
        """
        print("\n=== УПРОЩЕННАЯ ВИЗУАЛИЗАЦИЯ ТАБЛИЦЫ ===")
        
        # Создаем фигуру с упрощенной таблицей
        fig, ax = plt.subplots(figsize=(16, 10))
        ax.axis('tight')
        ax.axis('off')
        
        # Подготавливаем данные для упрощенной таблицы
        simple_data = []
        for _, row in df.iterrows():
            recommendations = str(row['recommendations'])[:50] + "..." if len(str(row['recommendations'])) > 50 else str(row['recommendations'])
            
            simple_data.append([
                f"ID {row['patient_id']}",
                row['primary_diagnosis'],
                row['severity'],
                recommendations
            ])
        
        # Создаем упрощенную таблицу
        table = ax.table(cellText=simple_data,
                        colLabels=['ID', 'Диагноз', 'Тяжесть', 'Рекомендации'],
                        cellLoc='left',
                        loc='center',
                        bbox=[0, 0, 1, 1])
        
        # Настраиваем стиль таблицы
        table.auto_set_font_size(False)
        table.set_fontsize(10)
        table.scale(1, 2.5)
        
        # Цветовое кодирование по тяжести
        for i in range(len(simple_data) + 1):
            for j in range(4):
                cell = table[(i, j)]
                if i == 0:  # Заголовок
                    cell.set_facecolor('#2196F3')
                    cell.set_text_props(weight='bold', color='white')
                else:
                    # Цветовое кодирование по тяжести
                    severity = simple_data[i-1][2]
                    if severity == 'Норма':
                        cell.set_facecolor('#E8F5E8')
                    elif severity == 'Умеренная':
                        cell.set_facecolor('#FFF3CD')
                    elif severity == 'Выраженная':
                        cell.set_facecolor('#F8D7DA')
                    elif severity == 'Критическая':
                        cell.set_facecolor('#F5C6CB')
                    
                    # Выделяем ID
                    if j == 0:
                        cell.set_text_props(weight='bold')
        
        plt.title('УПРОЩЕННАЯ ТАБЛИЦА ПАЦИЕНТОВ', fontsize=16, fontweight='bold', pad=20)
        
        # Добавляем легенду
        legend_elements = [
            plt.Rectangle((0,0),1,1, facecolor='#E8F5E8', label='Норма'),
            plt.Rectangle((0,0),1,1, facecolor='#FFF3CD', label='Умеренная'),
            plt.Rectangle((0,0),1,1, facecolor='#F8D7DA', label='Выраженная'),
            plt.Rectangle((0,0),1,1, facecolor='#F5C6CB', label='Критическая')
        ]
        ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 0.9))
        
        plt.tight_layout()
        plt.savefig('patients_simple_table_visualization.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Сохранена упрощенная визуализация таблицы: patients_simple_table_visualization.png")
        
        # Создаем также статистическую визуализацию
        self._create_table_statistics_visualization(df)
    
    def _create_table_statistics_visualization(self, df):
        """
        Создает статистическую визуализацию таблицы
        """
        print("\n=== СТАТИСТИЧЕСКАЯ ВИЗУАЛИЗАЦИЯ ТАБЛИЦЫ ===")
        
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        
        # 1. Распределение по диагнозам
        ax1 = axes[0, 0]
        diagnosis_counts = df['primary_diagnosis'].value_counts()
        colors = ['lightgreen', 'red']
        wedges, texts, autotexts = ax1.pie(diagnosis_counts.values, 
                                          labels=diagnosis_counts.index, 
                                          autopct='%1.1f%%',
                                          colors=colors,
                                          startangle=90)
        ax1.set_title('Распределение по диагнозам', fontsize=14, fontweight='bold')
        
        # 2. Распределение по тяжести
        ax2 = axes[0, 1]
        severity_counts = df['severity'].value_counts()
        severity_colors = {'Норма': 'green', 'Умеренная': 'orange', 'Выраженная': 'red', 'Критическая': 'darkred'}
        bars = ax2.bar(severity_counts.index, severity_counts.values, 
                      color=[severity_colors.get(x, 'gray') for x in severity_counts.index])
        ax2.set_title('Распределение по тяжести', fontsize=14, fontweight='bold')
        ax2.set_ylabel('Количество пациентов')
        plt.setp(ax2.get_xticklabels(), rotation=45)
        
        # 3. Критерии диагностики (топ-10)
        ax3 = axes[1, 0]
        # Собираем все критерии
        all_criteria = []
        for criteria in df['secondary_diagnoses'].dropna():
            if criteria:
                criteria_list = str(criteria).split('; ')
                all_criteria.extend(criteria_list)
        
        if all_criteria:
            criteria_counts = pd.Series(all_criteria).value_counts().head(10)
            bars = ax3.barh(range(len(criteria_counts)), criteria_counts.values)
            ax3.set_yticks(range(len(criteria_counts)))
            ax3.set_yticklabels([criterion[:30] + "..." if len(criterion) > 30 else criterion 
                                for criterion in criteria_counts.index])
            ax3.set_title('Топ-10 критериев диагностики', fontsize=14, fontweight='bold')
            ax3.set_xlabel('Количество случаев')
        
        # 4. Рекомендации
        ax4 = axes[1, 1]
        recommendations_counts = df['recommendations'].value_counts()
        bars = ax4.bar(range(len(recommendations_counts)), recommendations_counts.values, 
                      color=['lightblue', 'lightcoral'])
        ax4.set_xticks(range(len(recommendations_counts)))
        ax4.set_xticklabels([rec[:20] + "..." if len(rec) > 20 else rec 
                            for rec in recommendations_counts.index], rotation=45)
        ax4.set_title('Распределение рекомендаций', fontsize=14, fontweight='bold')
        ax4.set_ylabel('Количество пациентов')
        
        plt.tight_layout()
        plt.savefig('patients_table_statistics.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Сохранена статистическая визуализация: patients_table_statistics.png")


def main():
    """
    Основная функция для запуска диагностики
    """
    print("Диагностика пациенток на основе медицинских талагоний")
    print("="*60)
    
    # Создание анализатора
    analyzer = FetalHealthAnalyzer('f_health.csv')
    
    # Загрузка данных
    analyzer.load_data()
    
    # Диагностика на основе медицинских талагоний
    analyzer.diagnose_patients_by_criteria()
    
    # Детальный анализ по пациенткам с диагнозами
    analyzer.generate_detailed_patient_analysis()
    
    # Визуализация индивидуальных пациенток
    analyzer.visualize_individual_patients(n_patients=20)
    
    # Детальный отчет по диагнозам
    analyzer.generate_detailed_diagnosis_report()
    
    # Визуализация детального отчета
    analyzer.visualize_detailed_report()
    
    # Создание таблицы пациентов
    analyzer.create_patients_table()
    
    # Визуализация таблицы пациентов
    analyzer.visualize_patients_table()

if __name__ == "__main__":
    main()
