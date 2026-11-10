# --- Build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q package -DskipTests

# --- Runtime ---
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 invsys && mkdir -p /app/data/uploads && chown -R invsys /app
USER invsys
COPY --from=build /app/target/invsys-backend-*.jar app.jar
ENV STORAGE_DIR=/app/data/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
