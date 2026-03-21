package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.common.controller.AbstractControllerTest;

import java.util.UUID;

public abstract class AbstractAuthControllerTest extends AbstractControllerTest {

    // Person UUIDs uit data.sql
    protected static final UUID ADMIN_PERSON_ID = UUID.fromString("b1000000-0000-0000-0000-000000000001");
    protected static final UUID EMPLOYEE_PERSON_ID = UUID.fromString("b1000000-0000-0000-0000-000000000002");
    protected static final UUID MANAGER_PERSON_ID = UUID.fromString("b1000000-0000-0000-0000-000000000003");
    protected static final UUID EMPLOYEE_TECHPARTNER_PERSON_ID = UUID.fromString("b1000000-0000-0000-0000-000000000004");

    // Account UUIDs uit data.sql
    protected static final UUID ADMIN_ACCOUNT_ID = UUID.fromString("e1000000-0000-0000-0000-000000000001");
    protected static final UUID EMPLOYEE_ACCOUNT_ID = UUID.fromString("e1000000-0000-0000-0000-000000000002");
    protected static final UUID MANAGER_ACCOUNT_ID = UUID.fromString("e1000000-0000-0000-0000-000000000003");

    // Role UUIDs uit data.sql
    protected static final UUID ROLE_ADMIN_ID = UUID.fromString("c1000000-0000-0000-0000-000000000001");
    protected static final UUID ROLE_EMPLOYEE_ID = UUID.fromString("c1000000-0000-0000-0000-000000000002");
    protected static final UUID ROLE_MANAGER_ID = UUID.fromString("c1000000-0000-0000-0000-000000000003");
}
