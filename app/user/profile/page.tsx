'use client';

import { useState } from 'react';
import { User, Mail, Calendar, MapPin, Heart, BookOpen, Settings, LogOut } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'bookings', name: 'My Bookings', icon: Calendar },
    { id: 'favorites', name: 'Favorites', icon: Heart },
    { id: 'reviews', name: 'Reviews', icon: BookOpen },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <ProtectedRoute>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  {user?.picture ? (
                    <Image
                      src={user.picture}
                      alt={user.name || 'User'}
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center">
                      <User size={32} className="text-slate-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-slate-900">{user?.name || 'Travel Enthusiast'}</h1>
                  <div className="flex items-center gap-2 text-slate-600 mt-1">
                    <Mail size={16} />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 mt-1">
                    <Calendar size={16} />
                    <span>Member since {new Date(user?.createdAt || '').toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 transition-colors"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <nav className="space-y-2">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                            activeTab === tab.id
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={20} />
                          <span>{tab.name}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  {activeTab === 'profile' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Profile Information</h2>
                      <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                            <input
                              type="text"
                              defaultValue={user?.name || ''}
                              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input
                              type="email"
                              defaultValue={user?.email || ''}
                              disabled
                              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                          <textarea
                            rows={4}
                            placeholder="Tell us about yourself..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                          <input
                            type="text"
                            placeholder="Where are you from?"
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Save Changes
                        </button>
                      </form>
                    </div>
                  )}

                  {activeTab === 'bookings' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">My Bookings</h2>
                      <div className="text-center py-12">
                        <Calendar size={48} className="text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No bookings yet</h3>
                        <p className="text-slate-500 mb-4">Start exploring and book your first adventure!</p>
                        <a
                          href="/search"
                          className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Browse Tours
                        </a>
                      </div>
                    </div>
                  )}

                  {activeTab === 'favorites' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Favorite Tours</h2>
                      <div className="text-center py-12">
                        <Heart size={48} className="text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No favorites yet</h3>
                        <p className="text-slate-500 mb-4">Save tours you love to find them easily later!</p>
                        <a
                          href="/search"
                          className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Discover Tours
                        </a>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">My Reviews</h2>
                      <div className="text-center py-12">
                        <BookOpen size={48} className="text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No reviews yet</h3>
                        <p className="text-slate-500">Share your experiences to help other travelers!</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h2>
                      <div className="space-y-6">
                        <div className="border border-slate-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Notifications</h3>
                          <div className="space-y-4">
                            <label className="flex items-center gap-3">
                              <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                              <span>Email notifications for booking confirmations</span>
                            </label>
                            <label className="flex items-center gap-3">
                              <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                              <span>Special offers and promotions</span>
                            </label>
                            <label className="flex items-center gap-3">
                              <input type="checkbox" className="rounded border-slate-300" />
                              <span>Travel tips and destination guides</span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="border border-slate-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Privacy</h3>
                          <div className="space-y-4">
                            <label className="flex items-center gap-3">
                              <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                              <span>Make my profile public</span>
                            </label>
                            <label className="flex items-center gap-3">
                              <input type="checkbox" className="rounded border-slate-300" />
                              <span>Allow others to see my reviews</span>
                            </label>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Account</h3>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-slate-700 mb-2">Delete Account</h4>
                              <p className="text-sm text-slate-500 mb-3">
                                Once you delete your account, there is no going back. Please be certain.
                              </p>
                              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                                Delete Account
                              </button>
                            </div>
                          </div>
                        </div>

                        <button className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                          Save Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </ProtectedRoute>
  );
}