import { createContext, useContext } from 'react'
import { PatientType } from '../../types'

const PatientContext = createContext<{ patient: PatientType | null, setPatient: (value: PatientType) => void } | null>(null)

export function usePatientContext() {
    const context = useContext(PatientContext)
    if (!context) throw new Error(`Ошибка! Пациент не выбран`)
    return context
}

export { PatientContext }