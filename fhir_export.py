#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FHIR R4 экспорт данных КТГ для интеграции с МИС
"""

import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path

from fhir.resources.patient import Patient
from fhir.resources.device import Device
from fhir.resources.observation import Observation
from fhir.resources.diagnosticreport import DiagnosticReport
# from fhir.resources.bundle import Bundle, BundleEntry
# from fhir.resources.fhirtypes import BundleType
from fhir.resources.humanname import HumanName
from fhir.resources.identifier import Identifier
from fhir.resources.coding import Coding
from fhir.resources.codeableconcept import CodeableConcept
from fhir.resources.sampleddata import SampledData
from fhir.resources.quantity import Quantity
from fhir.resources.period import Period
from fhir.resources.reference import Reference

import httpx
import logging

logger = logging.getLogger(__name__)


class FHIRExportConfig:
    """Конфигурация для FHIR экспорта"""
    
    def __init__(self, config_path: str = "fhir_export_config.json"):
        self.config_path = Path(config_path)
        self.configs = self._load_config()
    
    def _load_config(self) -> Dict:
        """Загружает конфигурацию из файла"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"Конфигурационный файл {self.config_path} не найден, используем дефолтную конфигурацию")
                return self._get_default_config()
        except Exception as e:
            logger.error(f"Ошибка загрузки конфигурации: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Возвращает дефолтную конфигурацию"""
        return {
            "export_configs": {
                "default": {
                    "protocols": ["fhir_r4"],
                    "fhir": {
                        "version": "R4",
                        "base_url": "http://localhost:8080/fhir",
                        "auth": {"type": "none"},
                        "mapping": {
                            "fhr_loinc": "8867-4",
                            "uc_loinc": "11367-0",
                            "device_type": "CTG_MONITOR",
                            "device_manufacturer": "Fetal Monitoring System"
                        }
                    }
                }
            }
        }
    
    def get_config(self, config_name: str = "default") -> Dict:
        """Получает конфигурацию по имени"""
        return self.configs.get("export_configs", {}).get(config_name, self.configs["export_configs"]["default"])
    
    def list_configs(self) -> List[str]:
        """Возвращает список доступных конфигураций"""
        return list(self.configs.get("export_configs", {}).keys())


class FHIRExporter:
    """Экспортер данных КТГ в FHIR R4"""
    
    def __init__(self, config: FHIRExportConfig):
        self.config = config
    
    def create_patient_resource(self, patient_data: Dict) -> Patient:
        """Создает FHIR Patient ресурс"""
        # Имя пациента
        name = HumanName(family=patient_data["full_name"])
        
        # Идентификатор
        identifier = Identifier(
            value=patient_data["id"],
            system="http://hospital.local/patients"
        )
        
        patient = Patient(
            id=patient_data["id"],
            name=[name],
            identifier=[identifier]
        )
        
        return patient
    
    def create_device_resource(self, device_id: str, config: Dict) -> Device:
        """Создает FHIR Device ресурс"""
        # Тип устройства
        device_type_coding = Coding(
            code="CTG_MONITOR",
            display="Cardiotocography Monitor",
            system="http://hospital.local/device-types"
        )
        device_type = CodeableConcept(coding=[device_type_coding])
        
        device = Device(
            id=device_id,
            type=device_type,
            manufacturer=config.get("mapping", {}).get("device_manufacturer", "Fetal Monitoring System")
        )
        
        return device
    
    def create_observation_resource(self, 
                                 patient_id: str, 
                                 device_id: str, 
                                 data_points: List[Dict], 
                                 observation_type: str,
                                 config: Dict) -> Observation:
        """Создает FHIR Observation ресурс для серии данных"""
        # Категория
        category_coding = Coding(
            code="vital-signs",
            display="Vital Signs",
            system="http://terminology.hl7.org/CodeSystem/observation-category"
        )
        category = CodeableConcept(coding=[category_coding])
        
        # Код наблюдения
        if observation_type == "fhr":
            code_coding = Coding(
                code=config.get("mapping", {}).get("fhr_loinc", "8867-4"),
                display="Fetal Heart Rate",
                system="http://loinc.org"
            )
        elif observation_type == "uc":
            code_coding = Coding(
                code=config.get("mapping", {}).get("uc_loinc", "11367-0"),
                display="Uterine Contractions",
                system="http://loinc.org"
            )
        code = CodeableConcept(coding=[code_coding])
        
        # Ссылки
        patient_ref = Reference(reference=f"Patient/{patient_id}")
        device_ref = Reference(reference=f"Device/{device_id}")
        
        # Период наблюдения
        effective_period = None
        if data_points:
            effective_period = Period(
                start=data_points[0]["timestamp"],
                end=data_points[-1]["timestamp"]
            )
        
        # SampledData для временных рядов
        data_string = ""
        for point in data_points:
            if observation_type == "fhr":
                data_string += f"{point['t_ms']/1000.0:.1f},{point['fhr_bpm']} "
            elif observation_type == "uc":
                data_string += f"{point['t_ms']/1000.0:.1f},{point['uc_mmHg']:.2f} "
        
        sampled_data = SampledData(
            origin=Quantity(value=0, unit="s"),
            period=0.1,  # 10 Hz
            dimensions=1,
            factor=1.0,
            data=data_string.strip()
        )
        
        observation = Observation(
            id=f"{observation_type}_{patient_id}_{int(datetime.now().timestamp())}",
            status="final",
            category=[category],
            code=code,
            subject=patient_ref,
            device=device_ref,
            effectivePeriod=effective_period,
            valueSampledData=sampled_data
        )
        
        return observation
    
    def create_diagnostic_report(self, 
                               patient_id: str, 
                               device_id: str,
                               observations: List[Observation],
                               config: Dict) -> DiagnosticReport:
        """Создает FHIR DiagnosticReport"""
        # Категория
        category_coding = Coding(
            code="LAB",
            display="Laboratory",
            system="http://terminology.hl7.org/CodeSystem/v2-0074"
        )
        category = CodeableConcept(coding=[category_coding])
        
        # Код
        code_coding = Coding(
            code="11502-2",
            display="Laboratory report",
            system="http://loinc.org"
        )
        code = CodeableConcept(coding=[code_coding])
        
        # Ссылки
        patient_ref = Reference(reference=f"Patient/{patient_id}")
        result_refs = [Reference(reference=f"Observation/{obs.id}") for obs in observations]
        
        report = DiagnosticReport(
            id=f"ctg_report_{patient_id}_{int(datetime.now().timestamp())}",
            status="final",
            category=[category],
            code=code,
            subject=patient_ref,
            result=result_refs,
            effectiveDateTime=datetime.now(timezone.utc).isoformat()
        )
        
        return report
    
    def create_bundle(self, 
                     patient_data: Dict, 
                     data_points: List[Dict],
                     config_name: str = "default") -> Dict:
        """Создает FHIR Bundle с данными КТГ"""
        config = self.config.get_config(config_name)
        fhir_config = config.get("fhir", {})
        
        # Создаем Bundle как обычный dict
        bundle = {
            "resourceType": "Bundle",
            "id": f"ctg_export_{patient_data['id']}_{int(datetime.now().timestamp())}",
            "type": "collection",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "entry": []
        }
        
        entries = []
        
        # 1. Patient
        patient = self.create_patient_resource(patient_data)
        patient_entry = {
            "resource": patient.dict(),
            "fullUrl": f"Patient/{patient.id}"
        }
        entries.append(patient_entry)
        
        # 2. Device
        device_id = f"ctg_device_{patient_data['id']}"
        device = self.create_device_resource(device_id, fhir_config)
        device_entry = {
            "resource": device.dict(),
            "fullUrl": f"Device/{device.id}"
        }
        entries.append(device_entry)
        
        # 3. Observations
        observations = []
        
        # FHR Observation
        if data_points:
            fhr_obs = self.create_observation_resource(
                patient_data["id"], 
                device_id, 
                data_points, 
                "fhr", 
                fhir_config
            )
            fhr_entry = {
                "resource": fhr_obs.dict(),
                "fullUrl": f"Observation/{fhr_obs.id}"
            }
            entries.append(fhr_entry)
            observations.append(fhr_obs)
            
            # UC Observation
            uc_obs = self.create_observation_resource(
                patient_data["id"], 
                device_id, 
                data_points, 
                "uc", 
                fhir_config
            )
            uc_entry = {
                "resource": uc_obs.dict(),
                "fullUrl": f"Observation/{uc_obs.id}"
            }
            entries.append(uc_entry)
            observations.append(uc_obs)
        
        # 4. DiagnosticReport
        if observations:
            report = self.create_diagnostic_report(
                patient_data["id"], 
                device_id, 
                observations, 
                fhir_config
            )
            report_entry = {
                "resource": report.dict(),
                "fullUrl": f"DiagnosticReport/{report.id}"
            }
            entries.append(report_entry)
        
        bundle["entry"] = entries
        return bundle
    
    async def export_to_fhir_server(self, 
                                  bundle: Dict, 
                                  config_name: str = "default") -> Dict[str, Any]:
        """Отправляет Bundle на FHIR сервер"""
        config = self.config.get_config(config_name)
        fhir_config = config.get("fhir", {})
        
        base_url = fhir_config.get("base_url", "http://localhost:8080/fhir")
        auth_config = fhir_config.get("auth", {})
        
        headers = {
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json"
        }
        
        # Аутентификация
        if auth_config.get("type") == "bearer":
            headers["Authorization"] = f"Bearer {auth_config.get('token', '')}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/Bundle",
                    json=bundle,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    return {
                        "success": True,
                        "status_code": response.status_code,
                        "response": response.json() if response.content else None
                    }
                else:
                    return {
                        "success": False,
                        "status_code": response.status_code,
                        "error": response.text
                    }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Глобальный экземпляр
fhir_config = FHIRExportConfig()
fhir_exporter = FHIRExporter(fhir_config)
