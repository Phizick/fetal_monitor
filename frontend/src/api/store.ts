import { configureStore } from '@reduxjs/toolkit'
import { initialApi } from './initialApi'

export const store = configureStore({
    reducer: {
        [initialApi.reducerPath]: initialApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(initialApi.middleware),
})
