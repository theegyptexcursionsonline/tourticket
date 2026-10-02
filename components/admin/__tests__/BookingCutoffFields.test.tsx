/** @jest-environment jsdom */
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingCutoffFields from '../BookingCutoffFields';
function Form() {
  const [value, setValue] = useState(0);
  return <><BookingCutoffFields value={value} onChange={setValue} /><output>{String(value)}</output></>;
}
describe('admin booking cutoff input', () => {
  it('supports hours and minutes and explains crossing previous day', () => {
    render(<Form />);
    expect(screen.getByText('Customers can book until the departure time.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Cutoff hours'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Cutoff minutes'), { target: { value: '30' } });
    expect(screen.getByText('750')).toBeTruthy();
    expect(screen.getByText(/10:00 departure closes at 21:30, 1 day earlier/)).toBeTruthy();
  });
  it('does not normalize invalid minutes into silently valid hours', () => {
    render(<Form />);
    fireEvent.change(screen.getByLabelText('Cutoff minutes'), { target: { value: '60' } });
    expect(screen.getByRole('alert').textContent).toContain('whole hours');
    expect((screen.getByLabelText('Cutoff minutes') as HTMLInputElement).value).toBe('60');
    fireEvent.change(screen.getByLabelText('Cutoff minutes'), { target: { value: '0' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('preserves blank input, recovers from NaN and follows an external reset', () => {
    const { unmount } = render(<Form />);
    fireEvent.change(screen.getByLabelText('Cutoff hours'), { target: { value: '' } });
    expect((screen.getByLabelText('Cutoff hours') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('NaN')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Cutoff hours'), { target: { value: '2' } });
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
    const { rerender } = render(<BookingCutoffFields value={125} onChange={jest.fn()} />);
    rerender(<BookingCutoffFields value={0} onChange={jest.fn()} />);
    expect((screen.getByLabelText('Cutoff hours') as HTMLInputElement).value).toBe('0');
    expect((screen.getByLabelText('Cutoff minutes') as HTMLInputElement).value).toBe('0');
  });

});
