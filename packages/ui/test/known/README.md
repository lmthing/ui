# known

One file per component with an open reading/acting problem, named `<Id>.md`, saying what is wrong.
While the file exists, that component's reading test is expected to fail (`it.fails`), so `main`
stays green. The agent that fixes the component deletes its file; the test then must pass.
