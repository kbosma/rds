package nl.puurkroatie.rds.docgen.service;

import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Zet het document-model (de immutable context-beans uit {@code docgen.context}) om naar
 * een PLATTE structuur van maps, lijsten en eenvoudige waarden voor de FreeMarker-template.
 *
 * Waarom: de .docx-templates zijn door gebruikers geüpload en dus niet-vertrouwd. Geeft je
 * FreeMarker een Java-bean, dan kan een template via o.a. {@code booking.class} bij
 * reflectie (klasse, classloader, ...) komen. Een map levert alleen de sleutels die erin
 * zitten; daar valt niets te reflecteren.
 *
 * De omzetting behoudt wat een template tot nu toe kon gebruiken:
 * <ul>
 *   <li>bean-properties worden map-sleutels met dezelfde naam (incl. berekende getters);</li>
 *   <li>getallen blijven getallen (FreeMarker maakt ze op met zijn getalnotatie; naar tekst
 *       omzetten zou de weergave veranderen);</li>
 *   <li>datums/tijden worden hun ISO-tekst, precies wat {@code ${...}} voorheen toonde;</li>
 *   <li>lijsten blijven lijsten (voor {@code [#list ...]});</li>
 *   <li>{@code null} blijft {@code null} (zodat {@code ${x!""}} blijft werken).</li>
 * </ul>
 *
 * Een onbekend type wordt geweigerd in plaats van stilletjes als bean doorgegeven: een nieuw
 * type in het model moet bewust hier worden toegestaan.
 */
public final class TemplateModels {

    /** Alleen beans uit dit package worden omgezet; alles daarbuiten is onbekend. */
    private static final String CONTEXT_PACKAGE = "nl.puurkroatie.rds.docgen.context.";

    private TemplateModels() {
    }

    /** @param context een context-bean (bv. BookingContext) */
    public static Map<String, Object> toModel(Object context) {
        Object converted = convert(context);
        if (!(converted instanceof Map)) {
            throw new IllegalArgumentException("The template model root must be a context bean, was: "
                    + (context == null ? "null" : context.getClass().getName()));
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> model = (Map<String, Object>) converted;
        return model;
    }

    private static Object convert(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String || value instanceof Number || value instanceof Boolean) {
            return value;
        }
        if (value instanceof TemporalAccessor || value instanceof Enum) {
            return value.toString();
        }
        if (value instanceof Collection<?> collection) {
            List<Object> list = new ArrayList<>(collection.size());
            for (Object element : collection) {
                list.add(convert(element));
            }
            return list;
        }
        if (value.getClass().getName().startsWith(CONTEXT_PACKAGE)) {
            return beanToMap(value);
        }
        throw new IllegalArgumentException("Type not allowed in a document template model: " + value.getClass().getName());
    }

    private static Map<String, Object> beanToMap(Object bean) {
        Map<String, Object> map = new LinkedHashMap<>();
        try {
            // Object.class als stop: sluit de 'class'-property (getClass) uit.
            for (PropertyDescriptor property : Introspector.getBeanInfo(bean.getClass(), Object.class).getPropertyDescriptors()) {
                Method getter = property.getReadMethod();
                if (getter != null) {
                    map.put(property.getName(), convert(getter.invoke(bean)));
                }
            }
        } catch (IntrospectionException | IllegalAccessException | InvocationTargetException e) {
            throw new IllegalStateException("Could not build the template model for " + bean.getClass().getName(), e);
        }
        return map;
    }
}
