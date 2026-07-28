import fs from 'node:fs';
import path from 'node:path';

describe('unified Pages content-type contract', () => {
  const createSource = fs.readFileSync(
    path.join(process.cwd(), 'app', 'admin', 'pages', 'create', 'page.tsx'),
    'utf8',
  );
  const editorSource = fs.readFileSync(
    path.join(process.cwd(), 'components', 'admin', 'AttractionPageForm.tsx'),
    'utf8',
  );

  it('offers the three client-facing types once at the top-level create screen', () => {
    expect(createSource).toContain("label: 'Attraction'");
    expect(createSource).toContain("label: 'Category'");
    expect(createSource).toContain("label: 'Catalogue'");
  });

  it('does not expose a second control that can change the stored page type', () => {
    expect(editorSource).not.toContain(
      "onClick={() => setFormData((prev) => ({ ...prev, pageType: value }))}",
    );
    expect(editorSource).toContain(
      "Chosen from Create New Page and kept fixed",
    );
  });
});
