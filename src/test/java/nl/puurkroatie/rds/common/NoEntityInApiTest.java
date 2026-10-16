package nl.puurkroatie.rds.common;

import jakarta.persistence.Entity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Field;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.WildcardType;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bewaakt de projectregel "nooit entities exposen": geen enkele controller-methode mag een JPA-entity
 * als parameter of (ook niet geneste) returnwaarde hebben, en geen DTO mag een entity als veld hebben.
 * Een entity in een response lekt alles wat een getter heeft (bv. wachtwoord-hash, TOTP-geheim).
 */
class NoEntityInApiTest {

    private static final String BASE_PACKAGE = "nl.puurkroatie.rds";

    @Test
    void controllersAndDtosNeverUseEntities() throws Exception {
        List<String> violations = new ArrayList<>();

        for (Class<?> controller : findControllers()) {
            for (Method method : controller.getDeclaredMethods()) {
                if (!Modifier.isPublic(method.getModifiers())) {
                    continue;
                }
                String where = controller.getSimpleName() + "." + method.getName();
                collectEntities(method.getGenericReturnType(), new HashSet<>(), where + " (return)", violations);
                for (Type parameter : method.getGenericParameterTypes()) {
                    collectEntities(parameter, new HashSet<>(), where + " (parameter)", violations);
                }
            }
        }

        assertTrue(violations.isEmpty(), "Entities in de API-laag gevonden: " + violations);
    }

    private static List<Class<?>> findControllers() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        List<Class<?>> controllers = new ArrayList<>();
        for (BeanDefinition definition : scanner.findCandidateComponents(BASE_PACKAGE)) {
            controllers.add(Class.forName(definition.getBeanClassName()));
        }
        assertTrue(controllers.size() > 10, "Te weinig controllers gevonden; scant de test het goede pakket?");
        return controllers;
    }

    /** Loopt door generieke typen (List<X>, ResponseEntity<X>, ...) en door de velden van project-DTO's. */
    private static void collectEntities(Type type, Set<Class<?>> seen, String where, List<String> violations) {
        if (type instanceof ParameterizedType parameterized) {
            collectEntities(parameterized.getRawType(), seen, where, violations);
            for (Type argument : parameterized.getActualTypeArguments()) {
                collectEntities(argument, seen, where, violations);
            }
        } else if (type instanceof WildcardType wildcard) {
            for (Type bound : wildcard.getUpperBounds()) {
                collectEntities(bound, seen, where, violations);
            }
        } else if (type instanceof GenericArrayType array) {
            collectEntities(array.getGenericComponentType(), seen, where, violations);
        } else if (type instanceof Class<?> clazz) {
            if (clazz.isArray()) {
                collectEntities(clazz.getComponentType(), seen, where, violations);
            } else if (clazz.isAnnotationPresent(Entity.class)) {
                violations.add(where + " -> " + clazz.getSimpleName());
            } else if (clazz.getName().startsWith(BASE_PACKAGE) && seen.add(clazz)) {
                for (Field field : clazz.getDeclaredFields()) {
                    collectEntities(field.getGenericType(), seen, where + " > " + clazz.getSimpleName() + "." + field.getName(), violations);
                }
            }
        }
    }
}
