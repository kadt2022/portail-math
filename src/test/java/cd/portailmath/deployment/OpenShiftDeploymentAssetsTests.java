package cd.portailmath.deployment;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenShiftDeploymentAssetsTests {

    private static final Path PROJECT_ROOT = Path.of("").toAbsolutePath();
    private final Yaml yaml = new Yaml();

    @Test
    void githubWorkflowDefinesCiAndProtectedDeploymentJobs() throws IOException {
        var workflowText = read(".github/workflows/ci-cd-openshift.yml");
        var workflow = parse(".github/workflows/ci-cd-openshift.yml");
        var jobs = map(workflow.get("jobs"));
        var permissions = map(workflow.get("permissions"));
        var deployment = map(jobs.get("deploy-openshift"));
        var bvtSteps = list(map(jobs.get("bvt")).get("steps"));
        var deploymentCondition = deployment.get("if").toString()
                .replaceAll("\\s+", " ")
                .trim();

        assertTrue(jobs.keySet().containsAll(List.of(
                "preflight",
                "assemble",
                "test-backend",
                "test-frontend",
                "test-games",
                "bvt",
                "sonar",
                "quality-gate",
                "status-check",
                "deploy-openshift"
        )));
        assertEquals("read", permissions.get("contents"));
        assertEquals("openshift-dev", deployment.get("environment"));
        assertEquals("status-check", deployment.get("needs"));
        assertTrue(bvtSteps.stream()
                .map(this::map)
                .filter(step -> "actions/setup-java@v5".equals(step.get("uses")))
                .map(step -> map(step.get("with")))
                .anyMatch(configuration -> "temurin".equals(configuration.get("distribution"))
                        && "21".equals(configuration.get("java-version"))));
        assertEquals(
                "github.ref == 'refs/heads/main' && "
                        + "needs['status-check'].result == 'success' && "
                        + "(github.event_name == 'workflow_dispatch' || github.event_name == 'push')",
                deploymentCondition
        );
        assertFalse(workflowText.contains("pull_request_target"));
        assertFalse(workflowText.contains("write-all"));
    }

    @Test
    void buildConfigConsumesBinaryJarAndPublishesExpectedImageStreamTag() throws IOException {
        var buildConfig = parse("openshift/buildconfig.yml");
        var metadata = map(buildConfig.get("metadata"));
        var spec = map(buildConfig.get("spec"));
        var source = map(spec.get("source"));
        var output = map(spec.get("output"));
        var outputTarget = map(output.get("to"));
        var dockerfile = source.get("dockerfile").toString();

        assertEquals("BuildConfig", buildConfig.get("kind"));
        assertEquals("portail-math", metadata.get("name"));
        assertEquals("Binary", source.get("type"));
        assertTrue(dockerfile.contains("ubi9/openjdk-21-runtime"));
        assertTrue(dockerfile.contains("COPY app.jar /deployments/app.jar"));
        assertFalse(dockerfile.contains("gradle"));
        assertEquals("ImageStreamTag", outputTarget.get("kind"));
        assertEquals("portail-math:latest", outputTarget.get("name"));
    }

    @Test
    void deploymentServiceAndRouteAreConsistent() throws IOException {
        var deployment = parse("openshift/deployment.yml");
        var deploymentSpec = map(deployment.get("spec"));
        var selector = map(deploymentSpec.get("selector"));
        var matchLabels = map(selector.get("matchLabels"));
        var template = map(deploymentSpec.get("template"));
        var templateMetadata = map(template.get("metadata"));
        var podLabels = map(templateMetadata.get("labels"));
        var podSpec = map(template.get("spec"));
        var containers = list(podSpec.get("containers"));
        var container = map(containers.getFirst());

        assertEquals("portail-math", map(deployment.get("metadata")).get("name"));
        assertEquals(1, deploymentSpec.get("replicas"));
        assertEquals("portail-math", matchLabels.get("app"));
        assertEquals(matchLabels.get("app"), podLabels.get("app"));
        assertTrue(container.get("image").toString().contains("${OPENSHIFT_NAMESPACE}"));
        assertEquals(
                "/actuator/health/liveness",
                map(map(container.get("startupProbe")).get("httpGet")).get("path")
        );
        assertEquals(
                "/actuator/health/readiness",
                map(map(container.get("readinessProbe")).get("httpGet")).get("path")
        );
        assertEquals(
                "/actuator/health/liveness",
                map(map(container.get("livenessProbe")).get("httpGet")).get("path")
        );

        var service = parse("openshift/service.yml");
        var serviceSpec = map(service.get("spec"));
        var serviceSelector = map(serviceSpec.get("selector"));
        var servicePorts = list(serviceSpec.get("ports"));
        var servicePort = map(servicePorts.getFirst());

        assertEquals("portail-math", map(service.get("metadata")).get("name"));
        assertEquals(matchLabels.get("app"), serviceSelector.get("app"));
        assertEquals(8080, servicePort.get("port"));
        assertEquals("http", servicePort.get("targetPort"));

        var route = parse("openshift/route.yml");
        var routeSpec = map(route.get("spec"));
        var routeTarget = map(routeSpec.get("to"));
        var routePort = map(routeSpec.get("port"));
        var tls = map(routeSpec.get("tls"));

        assertEquals("portail", map(route.get("metadata")).get("name"));
        assertEquals("${OPENSHIFT_ROUTE_HOST}", routeSpec.get("host"));
        assertEquals("portail-math", routeTarget.get("name"));
        assertEquals("http", routePort.get("targetPort"));
        assertEquals("edge", tls.get("termination"));
        assertEquals("Redirect", tls.get("insecureEdgeTerminationPolicy"));
    }

    @Test
    void imageStreamAndHealthEndpointsExist() throws IOException {
        var imageStream = parse("openshift/imagestream.yml");
        var applicationConfiguration = read("src/main/resources/application.yml");

        assertEquals("ImageStream", imageStream.get("kind"));
        assertEquals("portail-math", map(imageStream.get("metadata")).get("name"));
        assertTrue(applicationConfiguration.contains("include: health,info"));
        assertTrue(applicationConfiguration.contains("probes:"));
        assertTrue(applicationConfiguration.contains("enabled: true"));
    }

    private Map<String, Object> parse(String relativePath) throws IOException {
        var result = yaml.load(read(relativePath));
        assertNotNull(result, () -> relativePath + " ne doit pas être vide");
        return map(result);
    }

    private String read(String relativePath) throws IOException {
        return Files.readString(PROJECT_ROOT.resolve(relativePath));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    private List<Object> list(Object value) {
        return (List<Object>) value;
    }
}
