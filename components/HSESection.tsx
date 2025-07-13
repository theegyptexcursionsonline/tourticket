import React from 'react';

const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-blue-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.5a9 9 0 11-9 9 4.5 4.5 0 011.546-3.419A5.96 5.96 0 0112 3a5.96 5.96 0 015.454 2.081A9.002 9.002 0 0118 12a9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9z" />
    </svg>
);

const HSESection = () => {
    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="container mx-auto px-6">
                <div className="mx-auto max-w-4xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-blue-700">Health, Safety & Environment</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        A Culture of Safety and Responsibility
                    </p>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        We believe that operational excellence is inseparable from a safe and responsible work environment. Our commitment to HSE is foundational to our success and the well-being of our team and partners.
                    </p>
                </div>
                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                        <div className="flex flex-col items-center text-center p-6 border border-gray-200 rounded-lg transition-shadow hover:shadow-lg">
                            <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900">
                                <ShieldIcon />
                                Spotless Safety Record
                            </dt>
                            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                <p className="flex-auto">We are proud of our spotless safety record, with **zero accidents reported**. This is a direct result of our rigorous safety standards and the proactive safety culture we foster.</p>
                            </dd>
                        </div>
                        <div className="flex flex-col items-center text-center p-6 border border-gray-200 rounded-lg transition-shadow hover:shadow-lg">
                            <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900">
                                <ShieldIcon />
                                Open Communication
                            </dt>
                            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                <p className="flex-auto">We create a culture of open communication where every team member is encouraged to voice their concerns and collaborate on solutions to maintain a safe workplace.</p>
                            </dd>
                        </div>
                        <div className="flex flex-col items-center text-center p-6 border border-gray-200 rounded-lg transition-shadow hover:shadow-lg">
                            <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900">
                                <ShieldIcon />
                                Resource Management
                            </dt>
                            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                <p className="flex-auto">Our mission includes developing effective practices for waste management and the optimal use of resources, reinforcing our commitment to environmental stewardship.</p>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    )
}

export default HSESection;