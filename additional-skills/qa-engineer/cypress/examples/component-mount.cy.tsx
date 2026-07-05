import { mount } from "cypress/react18";
import { SearchInput } from "./SearchInput";

describe("SearchInput Component", () => {
  it("renders with placeholder and handles input", () => {
    const onSearch = cy.stub().as("onSearch");

    mount(<SearchInput placeholder="Search items..." onSearch={onSearch} />);

    // Verify initial render state
    cy.get('[data-testid="search-input"]')
      .should("have.attr", "placeholder", "Search items...")
      .should("have.value", "");

    // Type and verify event handling
    cy.get('[data-testid="search-input"]').type("react testing");
    cy.get('[data-testid="search-submit"]').click();
    cy.get("@onSearch").should("have.been.calledWith", "react testing");
  });

  it("shows clear button only when input has value", () => {
    mount(<SearchInput onSearch={cy.stub()} />);

    // Clear button hidden when empty
    cy.get('[data-testid="search-clear"]').should("not.exist");

    // Clear button appears after typing
    cy.get('[data-testid="search-input"]').type("query");
    cy.get('[data-testid="search-clear"]').should("be.visible");

    // Clears input when clicked
    cy.get('[data-testid="search-clear"]').click();
    cy.get('[data-testid="search-input"]').should("have.value", "");
    cy.get('[data-testid="search-clear"]').should("not.exist");
  });

  it("shows error state when isError prop is true", () => {
    mount(<SearchInput onSearch={cy.stub()} isError errorMessage="No results found" />);

    cy.get('[data-testid="search-input"]').should("have.attr", "aria-invalid", "true");
    cy.get('[data-testid="search-error"]').should("contain.text", "No results found");
  });

  it("meets accessibility standards", () => {
    mount(<SearchInput placeholder="Search..." onSearch={cy.stub()} label="Search" />);

    cy.injectAxe();
    cy.checkA11y('[data-testid="search-container"]', {
      rules: { "color-contrast": { enabled: true } },
    });
  });
});
