# ----------- Stage 1: Build -----------
FROM gradle:8.5.0-jdk21 AS build

ENV GRADLE_USER_HOME=/home/gradle/.gradle
WORKDIR /app

COPY build.gradle settings.gradle /app/
COPY src /app/src

RUN gradle build -x test --no-daemon

# ----------- Stage 2: Run -------------
FROM eclipse-temurin:21-jdk-alpine
EXPOSE 8080

COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
