import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { loading: false },
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload
    }
  }
})

export const { setLoading } = uiSlice.actions
export default uiSlice.reducer
