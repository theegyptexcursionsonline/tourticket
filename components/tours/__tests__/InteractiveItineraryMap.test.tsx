import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InteractiveItineraryMap, { type InteractiveItineraryItem } from '../InteractiveItineraryMap';

const itinerary: InteractiveItineraryItem[] = [
  { time: '08:00', title: 'Hotel Pickup', description: 'Pickup from your hotel.', location: 'Your Hotel' },
  { time: '09:00', title: 'First Snorkel Stop', description: 'Explore the reef.', location: 'Red Sea' },
  { time: '10:30', title: 'Second Snorkel Stop', description: 'Visit another reef.', location: 'Red Sea' },
  { time: '12:00', title: 'Orange Bay', description: 'Relax on the island.', location: 'Orange Bay, Giftun Island' },
  { time: '14:00', title: 'Lunch', description: 'Lunch onboard.', location: 'On the boat' },
  { time: '15:00', title: 'Final Swim', description: 'Last sea stop.', location: 'Red Sea' },
  { time: '16:00', title: 'Hurghada Marina', description: 'Return to the marina.', location: 'Hurghada Marina' },
  { time: '17:00', title: 'Hotel Drop-off', description: 'Return to your hotel.', location: 'Your Hotel' },
];

function ControlledMap() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <InteractiveItineraryMap
      itinerary={itinerary}
      tourLocation="Orange Bay, Giftun Island, Hurghada"
      apiKey=""
      fallbackMapUrl="https://maps.example.test/fallback.png"
      openMapsUrl="https://maps.example.test/route"
      activeIndex={activeIndex}
      onSelect={setActiveIndex}
    />
  );
}

describe('InteractiveItineraryMap', () => {
  it('exposes one tap and keyboard target for every itinerary stage', () => {
    render(<ControlledMap />);
    const stageButtons = screen.getAllByRole('button', { name: /Show stage/i });
    expect(stageButtons).toHaveLength(8);
    expect(screen.getByLabelText('Interactive tour route with 8 numbered stages')).toBeInTheDocument();
  });

  it('updates the visible detail card when a stage is hovered, focused, or clicked', () => {
    render(<ControlledMap />);
    const orangeBay = screen.getByRole('button', { name: 'Show stage 4: Orange Bay' });
    fireEvent.mouseEnter(orangeBay);
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Orange Bay');
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Exact place');

    const lunch = screen.getByRole('button', { name: 'Show stage 5: Lunch' });
    fireEvent.click(lunch);
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Lunch');
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Approximate stage');
  });

  it('keeps a usable disclosed fallback when the interactive API is unavailable', async () => {
    render(<ControlledMap />);
    expect(await screen.findByAltText('Tour route map')).toHaveClass('object-cover');
    expect(screen.getByText(/Generic pickup, sea and onboard stages are approximate/i)).toBeInTheDocument();
  });
});
