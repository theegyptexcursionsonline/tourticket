import { isOpenBlockingModal } from '../modalVisibility';

const visibleRects = () => [{ width: 480, height: 720 }] as unknown as DOMRectList;

describe('isOpenBlockingModal', () => {
  it('accepts a visible, interactive aria-modal dialog', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.getClientRects = visibleRects;
    document.body.appendChild(dialog);

    expect(isOpenBlockingModal(dialog)).toBe(true);
  });

  it.each([
    ['aria-hidden', () => ({ name: 'aria-hidden', value: 'true' })],
    ['inert', () => ({ name: 'inert', value: '' })],
    ['hidden', () => ({ name: 'hidden', value: '' })],
  ])('rejects a mounted drawer closed with %s', (_label, attribute) => {
    const dialog = document.createElement('div');
    const { name, value } = attribute();
    dialog.setAttribute(name, value);
    dialog.getClientRects = visibleRects;
    document.body.appendChild(dialog);

    expect(isOpenBlockingModal(dialog)).toBe(false);
  });

  it('rejects non-blocking Google Maps dialogs', () => {
    const map = document.createElement('div');
    map.className = 'gm-style';
    const dialog = document.createElement('div');
    dialog.getClientRects = visibleRects;
    map.appendChild(dialog);
    document.body.appendChild(map);

    expect(isOpenBlockingModal(dialog)).toBe(false);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });
});
