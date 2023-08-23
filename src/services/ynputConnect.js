import { ayonApi } from './ayon'

const ynputConnect = ayonApi.injectEndpoints({
  endpoints: (build) => ({
    getYnputConnections: build.query({
      query: () => ({
        url: `/api/connect`,
        method: 'GET',
      }),
      providesTags: ['connections'],
      transformResponse: (response) => response,
      transformErrorResponse: (error) => error.data.detail || `Error ${error.status}`,
    }),
    connectYnput: build.mutation({
      query: ({ key }) => ({
        url: `/api/connect`,
        method: 'POST',
        body: { key },
      }),
      transformResponse: (response) => response,
      transformErrorResponse: (error) => error.data.detail || `Error ${error.status}`,
      invalidatesTags: ['connections'],
    }),
    discountYnput: build.mutation({
      query: () => ({
        url: `/api/connect`,
        method: 'DELETE',
      }),
      transformResponse: (response) => response,
      transformErrorResponse: (error) => error.data.detail || `Error ${error.status}`,
      invalidatesTags: ['connections'],
    }),
  }),
})

export const { useConnectYnputMutation, useDiscountYnputMutation, useGetYnputConnectionsQuery } =
  ynputConnect
