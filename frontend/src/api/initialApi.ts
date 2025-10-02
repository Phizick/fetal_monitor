import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { createApi } from '@reduxjs/toolkit/query/react'
import { PatientType } from '../types'

const baseQuery = fetchBaseQuery({
    baseUrl: 'http://77.246.158.103:8081/',
    mode: 'cors',
    headers: {
        "accept": "application/json",
        "Content-Type": "application/json"
    }
})


export const initialApi = createApi({
    reducerPath: 'initialApi',
    baseQuery,
    tagTypes: ['patient', 'patientsList'],
    endpoints: (builder) => ({
        getAllPatients: builder.query<PatientType[], void>({
            query: () => {
                return {
                    url: 'patients',
                    method: 'GET',
                }
            },
            providesTags: ['patientsList']
        }),
        getPatientById: builder.query<PatientType, string>({
            query(id) {
                return {
                    url: `patients/${id}`,
                    method: 'GET',
                }
            },
            providesTags: ['patient'],
        }),
        addPatients: builder.mutation<PatientType, { full_name: string }>({
            query: (body) => {
                return {
                    url: 'patients',
                    method: 'POST',
                    body
                }
            },
            invalidatesTags: ['patientsList']
        }),
        updateMedicationsById: builder.mutation<void, { id: string, medications: Array<string> }>({
            query({ id, medications }) {
                return {
                    url: `sim/medications/${id}`,
                    method: 'PUT',
                    body: JSON.stringify({ medications }),
                }
            },
            invalidatesTags: ['patient'],
        }),
        startMonitoring: builder.mutation<void, { id: string }>({
            query: ({ id }) => {
                return {
                    url: `monitoring/start/${id}`,
                    method: 'POST',
                }
            },
        }),
        stopMonitoring: builder.mutation<void, { id: string }>({
            query: ({ id }) => {
                return {
                    url: `monitoring/stop/${id}`,
                    method: 'POST',
                }
            },
        }),

    }),
})

export const {
    useGetAllPatientsQuery,
    useGetPatientByIdQuery,
    useUpdateMedicationsByIdMutation,
    useAddPatientsMutation,
    useStartMonitoringMutation,
    useStopMonitoringMutation
} = initialApi
