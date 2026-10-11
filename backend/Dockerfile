# Stage 1: Build the JAR with Maven
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Lightweight JRE runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# JVM options tuned for Render 512MB RAM free tier
# -XX:+UseSerialGC: lowers garbage collector memory overhead
# -Xmx384m: caps heap memory at 384MB to prevent Out-Of-Memory (Exit 137)
# -Xss512k: reduces thread stack size
ENV JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -Xmx384m -Xss512k"

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
