package com.example.backend.config;

import io.swagger.v3.oas.models.OpenAPI; // OpenAPI 객체를 위한 import
import io.swagger.v3.oas.models.info.Contact; // 연락처 정보를 위한 import
import io.swagger.v3.oas.models.info.Info;     // API 기본 정보를 위한 import
import io.swagger.v3.oas.models.info.License;   // 라이선스 정보를 위한 import
import io.swagger.v3.oas.models.servers.Server; // 서버 정보를 위한 import
import org.springframework.context.annotation.Bean; // @Bean 어노테이션을 위한 import
import org.springframework.context.annotation.Configuration; // @Configuration 어노테이션을 위한 import

import java.util.List; // List를 사용하기 위한 import

@Configuration // 이 클래스가 Spring 설정 파일임을 명시
public class SwaggerConfig {

    /**
     * OpenAPI 객체를 설정하는 Bean을 생성합니다.
     * 이 Bean은 Swagger UI에 표시될 API의 기본 정보 (제목, 설명, 버전 등)를 정의합니다.
     *
     * @return 설정된 OpenAPI 객체
     */
    @Bean
    public OpenAPI myOpenAPI() {
        // 1. API가 배포될 서버(URL) 정보 설정
        // 로컬 개발 환경 서버
        Server localServer = new Server();
        localServer.setUrl("http://localhost:8080"); // 애플리케이션이 실행될 로컬 서버 주소
        localServer.setDescription("Development server (Local)"); // 서버에 대한 설명

        // 만약 나중에 실제 운영 서버가 있다면 추가할 수 있습니다.
        Server prodServer = new Server();
        prodServer.setUrl("https://test13-2.onrender.com");
        prodServer.setDescription("Production Backend Server");

        // 운영 서버에 대한 설명

        // 2. API 문서 제공자의 연락처 정보 설정
        Contact contact = new Contact();
        contact.setEmail("your.email@example.com"); // 본인의 이메일 주소
        contact.setName("Your Name or Team Name"); // 담당자 또는 팀 이름
        contact.setUrl("http://www.your-company-website.com"); // 회사 또는 개인 웹사이트 URL (선택 사항)

        // 3. API 라이선스 정보 설정 (선택 사항)
        License customLicense = new License()
                .name("Apache 2.0 License") // 라이선스 이름
                .url("https://www.apache.org/licenses/LICENSE-2.0.html"); // 라이선스 URL

        // 4. API의 전반적인 정보 설정 (API 문서 상단에 표시될 내용)
        Info info = new Info()
                .title("EC Site API Documentation") // API 문서의 제목
                .version("1.0.0") // API 버전
                .contact(contact) // 위에서 정의한 연락처 정보
                .description("EC(E-commerce) 웹사이트 백엔드 API 문서입니다. 상품 조회, 주문, 사용자 관리 등의 기능을 제공합니다.") // API에 대한 상세 설명
                .termsOfService("http://www.example.com/terms") // 서비스 약관 URL (선택 사항)
                .license(customLicense); // 위에서 정의한 라이선스 정보

        // 최종 OpenAPI 객체 반환
        // 여기서는 info와 servers를 설정하여 OpenAPI 객체를 빌드합니다.
        return new OpenAPI()
                .info(info) // API 기본 정보 설정
                .servers(List.of(localServer , prodServer )); // API가 배포될 서버 목록 설정
    }
}
