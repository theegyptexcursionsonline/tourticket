// components/DayTripsServer.tsx
import React from 'react';
import DayTrips from './DayTrips';
import { Tour } from '@/types';

interface DayTripsServerProps {
  tours: Tour[];
}

export default function DayTripsServer({ tours }: DayTripsServerProps) {
  return <DayTrips initialTours={tours} />;
}
