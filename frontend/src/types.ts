export type PatientType = {
    id: string
    full_name: string,
    medications: Array<string>
    monitoring_token?: string | null
    session_id?: string | null
    is_monitoring?: boolean
}