'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PlanEditorForm from '../../PlanEditorForm';
import { toast } from 'sonner';

export default function EditPlanPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      fetch(`/api/admin/plans/${planId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPlan(data.data);
          } else {
            toast.error(data.error || 'Failed to load plan');
          }
        })
        .catch((err) => toast.error(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [planId]);

  if (isLoading) {
    return <div className="py-20 text-center text-gray-400 animate-pulse">Loading plan data...</div>;
  }

  if (!plan) {
    return <div className="py-20 text-center text-red-400">Plan not found</div>;
  }

  return <PlanEditorForm initialData={plan} planId={planId} />;
}
