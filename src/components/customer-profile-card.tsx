import React from 'react';
import { CustomerProfile } from '@/types';
import { UserCheck, Wallet, Sparkles, ShoppingBag, Store, ShieldCheck, Tag } from 'lucide-react';

interface CustomerProfileCardProps {
  profile: CustomerProfile;
  showBenchmark?: boolean; // STRICTLY for Judges and Admins only!
}

export const CustomerProfileCard: React.FC<CustomerProfileCardProps> = ({
  profile,
  showBenchmark = false,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 rounded text-xs font-semibold uppercase tracking-wider border border-blue-400/20">
              Profile #{profile.id}
            </span>
            <span className="text-xs text-slate-300 font-medium">Assigned Target Segment</span>
          </div>
          <span className="text-xs text-sky-300 font-semibold">{profile.age_range} Years</span>
        </div>
        <h3 className="text-lg font-bold text-white mt-2 tracking-tight">
          {profile.customer_profile}
        </h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Wallet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
                Budget / Income Context
              </span>
              <span className="font-bold text-slate-900 text-sm">{profile.budget_income_context}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
                Primary Purchase Factor
              </span>
              <span className="font-bold text-slate-900 text-sm">{profile.primary_purchase_factor}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <ShoppingBag className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
                Preferred Product Type
              </span>
              <span className="font-semibold text-slate-800">{profile.preferred_product}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Store className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block">
                Purchase Channel
              </span>
              <span className="font-semibold text-slate-800">{profile.purchase_channel}</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Other Key Preferences & Specifications
          </div>
          <p className="text-slate-800 font-medium leading-relaxed">{profile.other_preferences}</p>
        </div>

        {/* Confidential Benchmark - ONLY visible to Judges and Organisers */}
        {showBenchmark && profile.indicative_wtp && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900">
            <div className="flex items-center gap-1 font-bold text-amber-900 uppercase tracking-wider text-[10px] mb-1">
              <Tag className="w-3.5 h-3.5 text-amber-700" />
              CONFIDENTIAL ORGANISER / JUDGE BENCHMARK
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Indicative Willingness to Pay:</span>
              <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-amber-200">
                {profile.indicative_wtp}
              </span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1 italic">
              *Reference benchmark only. Judges evaluate pricing justification and logical reasoning, not strict exact match.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
