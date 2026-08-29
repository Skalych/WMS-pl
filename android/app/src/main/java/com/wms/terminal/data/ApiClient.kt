package com.wms.terminal.data

import com.wms.terminal.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface WmsApi {
    @POST("terminal/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("terminal/shift/clock-in")
    suspend fun clockIn(): ShiftClockResponse

    @POST("terminal/shift/clock-out")
    suspend fun clockOut(): ShiftClockResponse

    @GET("terminal/spheres")
    suspend fun spheres(): List<SphereDto>

    @GET("terminal/tasks/available")
    suspend fun availableTasks(): List<AvailableTaskDto>

    @POST("terminal/tasks/{taskId}/claim")
    suspend fun claimTask(@Path("taskId") taskId: String): SessionDto

    @GET("terminal/session/current")
    suspend fun currentSession(): Response<SessionDto>

    @POST("terminal/session/advance-location")
    suspend fun advanceLocation(): SessionDto

    @POST("terminal/session/scan")
    suspend fun scan(@Body body: ScanRequest): SessionDto

    @POST("terminal/session/confirm-quantity")
    suspend fun confirmQuantity(@Body body: ConfirmQuantityRequest): SessionDto
}

object ApiClient {
    fun create(tokenProvider: () -> String?): WmsApi {
        val authInterceptor = Interceptor { chain ->
            val token = tokenProvider()
            val request = if (token != null) {
                chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(WmsApi::class.java)
    }
}
