// components/booking/addOnData.ts

export const addOnData = [
    {
        id: 'atv-sunset' as const,
        title: '3-Hour ATV Quad Tour Sunset with Transfer',
        duration: '3 Hours',
        languages: ['English', 'German'],
        description: 'Enjoy a thrilling 30 k.m quad bike ride deep into the desert to a traditional Bedouin village...',
        price: 25.00,
        availableTimes: ['2:00 PM', '3:00 PM'],
    },
    {
        id: 'shared-quad' as const,
        title: 'Shared 2-Hour Quad Bike Tour',
        duration: '2 Hours',
        languages: ['English'],
        description: 'A thrilling shared quad bike adventure through the desert canyons...',
        price: 22.00,
        availableTimes: ['10:00 AM', '2:00 PM'],
    }
];