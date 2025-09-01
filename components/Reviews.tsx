import { Star } from 'lucide-react';

const reviewsData = [
    {
        name: '898yazans',
        date: 'Jun 1, 2025',
        text: 'I’ve had the pleasure of booking two trips through Yours & Ticket, and on both occasions, Luca has done an absolutely amazing job. He was incredibly friendly, professional, and welcoming from the very beginning, making the entire process smooth and enjoyable.',
        rating: 5,
    },
    {
        name: 'Southease_1967',
        date: 'Oct 24, 2024',
        text: 'Wow what can I say. 8 of us booked the windmills, clog, cheese and waffle tour. Guide was brilliant can\'t remember her name. But the driver Steff he was absolutely amazing. He made the trip. Piano playing had us singing and he is so funny.',
        rating: 5,
    },
    {
        name: 'LINDA AYE',
        date: 'Sep 14, 2024',
        text: 'One of the must do tour when you are in Amsterdam. Prices are reasonable and tour guides are the friendliest and knowledgeable. Highly recommended!',
        rating: 4,
    },
    {
        name: 'Lama Dakhakhni',
        date: 'Sep 14, 2024',
        text: 'The place is located at the water side from the station. Easy to find. The staff was speaking good English. They were very friendly.',
        rating: 5,
    },
     {
        name: 'Tanmay K. Mohapatra',
        date: 'Jul 20, 2024',
        text: 'Easy peasy. Quick and easy tickets.',
        rating: 4,
    },
];

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />
        ))}
    </div>
);

export default function Reviews() {
    return (
        <section className="bg-white py-16">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-slate-800 uppercase">
                        Read our reviews
                    </h2>
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <p className="font-semibold text-slate-600">87 reviews</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-800">4.2</span>
                            <StarRating rating={4} />
                        </div>
                        <p className="text-sm text-slate-500">Average rating from Tripadvisor</p>
                    </div>
                </div>

                <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    {reviewsData.map((review, index) => (
                        <div key={index} className="flex-shrink-0 w-80 bg-slate-50 p-6 rounded-lg shadow-sm border border-slate-100">
                            <h4 className="font-bold text-slate-800">{review.name}</h4>
                            <p className="text-xs text-slate-400 mb-4">{review.date}</p>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {review.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
