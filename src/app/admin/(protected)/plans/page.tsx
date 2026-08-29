'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit3, Trash2, Eye, EyeOff, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);

      const res = await fetch(`/api/admin/plans?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPlans(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch plans');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [search, statusFilter]);

  const handleTogglePublish = async (plan: any) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !plan.isPublished }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(plan.isPublished ? 'Plan unpublished' : 'Plan published');
        fetchPlans();
      } else {
        toast.error(data.error || 'Failed to update plan status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan? All user progress for this plan will also be removed.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Plan deleted successfully');
        fetchPlans();
      } else {
        toast.error(data.error || 'Failed to delete plan');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reading Plans Management</h1>
          <p className="text-sm text-gray-400">Configure, publish, and manage Bible reading plans</p>
        </div>
        <Link
          href="/admin/plans/new"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-colors shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Create New Plan</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1A1A1A] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {(['all', 'published', 'draft'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-teal-600/30 text-teal-400 border border-teal-500/40'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Plans List Table / Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-500 animate-pulse">Loading reading plans...</div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
          <p className="text-sm">No reading plans found.</p>
          <Link
            href="/admin/plans/new"
            className="inline-block mt-3 text-xs text-teal-400 hover:underline font-semibold"
          >
            + Create your first plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className="group bg-[#141414] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all flex flex-col justify-between"
            >
              {/* Cover Image */}
              <div className="relative aspect-[16/9] w-full bg-[#1A1A1A] overflow-hidden">
                <img
                  src={plan.imageUrl || plan.thumbnailUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800'}
                  alt={plan.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800');
                  }}
                />
                <div className="absolute top-3 right-3">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-md ${
                      plan.isPublished
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {plan.isPublished ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                    <span>{plan.isPublished ? 'Published' : 'Draft'}</span>
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-semibold text-teal-400">{plan.category}</span>
                  <span>{plan.duration} days</span>
                </div>
                <h3 className="text-base font-bold text-white line-clamp-1">{plan.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-2">{plan.description}</p>
              </div>

              {/* Actions Footer */}
              <div className="p-4 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleTogglePublish(plan)}
                  className="flex items-center space-x-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {plan.isPublished ? <EyeOff className="size-4 text-amber-400" /> : <Eye className="size-4 text-green-400" />}
                  <span>{plan.isPublished ? 'Unpublish' : 'Publish'}</span>
                </button>

                <div className="flex items-center space-x-3">
                  <Link
                    href={`/admin/plans/edit/${plan._id}`}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit3 className="size-4" />
                  </Link>
                  <button
                    onClick={() => handleDeletePlan(plan._id)}
                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    title="Delete Plan"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
