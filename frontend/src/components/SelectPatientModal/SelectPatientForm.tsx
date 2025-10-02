import { Form, FormInstance, Input, Select, Space } from "antd";
import { PatientType } from "../../types";
import styles from './selectPatient.module.css'

export const SelectPatientForm = ({ form, type, patients }: { form: FormInstance, type: 'fromBase' | 'handleAdd', patients?: Array<PatientType> }) => {
    const options = patients ? patients.map(item => ({ label: item.full_name, value: item.id })) : []
    return (
        <Form layout="vertical" form={form} name='selectPatientForm' className={styles.form}>
            {type === 'fromBase' && (
                <Form.Item name='patientId' label="ФИО">
                    <Select
                        showSearch
                        allowClear
                        placeholder="Выберите пациента"
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={options}></Select>
                </Form.Item>
            )}

            {type === 'handleAdd' && (
                <Form.Item name='patient' label="ФИО">
                    <Input
                        placeholder="Выберите пациента"
                    />
                </Form.Item>
            )}
            <Space style={{ marginTop: '12px', justifyContent: 'space-between', width: '100%' }}>
                <Form.Item name='age' label="Возраст">
                    <Input
                        suffix='лет'
                        placeholder="0"
                    />
                </Form.Item>
                <Form.Item name='gestationalAge' label="Срок">
                    <Input
                        suffix='нед.'
                        placeholder="0"
                    />
                </Form.Item>
            </Space>
        </Form>
    )
}