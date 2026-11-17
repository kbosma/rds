package nl.puurkroatie.rds.demo;

import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Zonder profiel {@code demo} bestaat niets van de demo: geen nep-Mollie, geen postbus, geen verschuifbare klok, en
 * {@code /demo/**} valt onder de gewone beveiliging (zonder token 401, met token geen endpoint).
 */
class DemoProfileAbsentTest extends AbstractControllerTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void noDemoBeans() {
        assertEquals(0, context.getBeanNamesForType(DemoClock.class).length);
        assertEquals(0, context.getBeanNamesForType(DemoMailbox.class).length);
        assertEquals(0, context.getBeanNamesForType(DemoMollieService.class).length);
        assertEquals(0, context.getBeanNamesForType(DemoController.class).length);
    }

    @Test
    void demoPaths_requireAuthentication() throws Exception {
        mockMvc.perform(get("/demo/mailbox")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/demo/clock").param("date", "2027-07-12")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/demo/mollie/checkout/tr_demoX").param("result", "paid")).andExpect(status().isUnauthorized());
    }

    @Test
    void demoPaths_doNotExist_evenWithAToken() throws Exception {
        mockMvc.perform(post("/demo/clock").param("date", "2027-07-12")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNotFound());
    }
}
