package com.example.backend.config;

import com.example.backend.jwt.JwtAuthenticationFilter;
import com.example.backend.jwt.JwtToken;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true) //@PreAuthorize 활성화
public class SecurityConfig {
    private final JwtToken jwtToken;

    public SecurityConfig(JwtToken jwtToken){
        this.jwtToken = jwtToken;
    }

    //비밀번호 암호화를 위한 빈 설정
    //회원가입 시 저장, 로그인 시 비교
    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    //로그인 시 UsernamePasswordAuthenticationToken 인증 수행에 사용
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws  Exception{
        return authenticationConfiguration.getAuthenticationManager();
    }

    //Vite 개발 서버에서 API 호출이 가능하도록 허용
    //나중에 배포할 땐 실제 도메인으로 변경 필요
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://127.0.0.1:5174","https://calmarketon-n2fk857wb-gurungd265s-projects.vercel.app")); // React/Vite 개발 서버 주소
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public RoleHierarchy roleHierarchy() {
        RoleHierarchyImpl roleHierarchy = new RoleHierarchyImpl();
        // ROLE_SUPER_ADMIN이 ROLE_ADMIN보다 상위 권한임을 정의
        String hierarchy = "ROLE_SUPER_ADMIN > ROLE_ADMIN > ROLE_USER";
        roleHierarchy.setHierarchy(hierarchy);
        return roleHierarchy;
    }

    //UsernamePasswordAuthenticationFilter 이전에 JWT 인증 필터를 등록
    //JwtAuthenticationFilter는 요청에서 토큰을 추출하고 유효성 검사 및 인증 주입 수행
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/users/signup").permitAll()
                        .requestMatchers("/api/products/**").permitAll()

                        // --- REVIEW API ---
                        .requestMatchers(HttpMethod.GET, "/api/products/*/reviews").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/products/*/reviews").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/products/*/reviews/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/products/*/reviews/*").authenticated()

                        .requestMatchers("/api/cart/items","/api/cart").permitAll()
                        .requestMatchers("/api/cart/items/**").permitAll()
                        .requestMatchers("/api/categories/**").permitAll()
                        .requestMatchers("/api/cart/merge").authenticated()
                        .requestMatchers("/api/cart/count").permitAll()

                        .requestMatchers("/api/cart/items/batch-delete").authenticated()

                        .requestMatchers("/api/users/me", "/api/users/me/**").authenticated()
                        .requestMatchers("/api/addresses/me", "/api/addresses/**").authenticated()
                        .requestMatchers("/api/balances/**").authenticated()
                        .requestMatchers("/api/register/**").authenticated()

                        .requestMatchers("/api/users/me/wishlists/**").authenticated()
                        .requestMatchers("/api/orders/**").authenticated()
                        .requestMatchers("/api/orders/admin/**").hasAnyRole("ADMIN","SUPER_ADMIN")
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/swagger-resources/**",
                                "/webjars/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                // JWT 필터를 UsernamePasswordAuthenticationFilter 이전에 추가
                .addFilterBefore(new JwtAuthenticationFilter(jwtToken), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

}
