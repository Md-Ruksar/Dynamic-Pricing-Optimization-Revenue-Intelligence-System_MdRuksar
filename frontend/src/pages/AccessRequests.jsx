import { useState, useEffect, useCallback } from 'react';
import { accessRequestsAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import usePendingRequests from '../hooks/usePendingRequests';
import {
  Inbox, CheckCircle2, XCircle, Loader2, RefreshCw, Shield,
  Mail, Calendar, Clock, UserCheck, ShieldCheck, X, MessageSquare,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'all', label: 'All', badge: 'badge-neutral' },
  { key: 'pending', label: 'Pending', badge: 'badge-warning' },
  { key: 'approved', label: 'Approved', badge: 'badge-success' },
  { key: 'rejected', label: 'Rejected', badge: 'badge-danger' },
];

const STATUS_BADGE = {
  Pending: 'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-danger',
};

function ProviderBadge({ provider }) {
  const isGoogle = provider === 'google';
  return (
    <span className={`badge ${isGoogle ? 'badge-info' : 'badge-neutral'}`}>
      {isGoogle ? 'Google' : 'Local'}
    </span>
  );
}

export default function AccessRequests() {
  const toast = useToast();
  const { count: pendingCount } = usePendingRequests();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [approveTarget, setApproveTarget] = useState(null);
  const [role, setRole] = useState('data_analyst');
  const [approving, setApproving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejecting, setRejecting] = useState(false);

  const notifyChanged = () => {
    window.dispatchEvent(new Event('access-requests-updated'));
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accessRequestsAPI.list({ status: tab, limit: 200 });
      setRequests(res.data);
    } catch (err) {
      toast.error('Failed to load access requests', err.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openApprove = (req) => {
    setApproveTarget(req);
    setRole(req.requested_role || 'data_analyst');
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await accessRequestsAPI.approve(approveTarget.id, role);
      toast.success('Request approved', `${approveTarget.name || approveTarget.email} can now sign in as ${role.replace('_', ' ')}`);
      setApproveTarget(null);
      fetchRequests();
      notifyChanged();  // refreshes the pending-count badge
    } catch (err) {
      toast.error('Approval failed', err.response?.data?.detail);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await accessRequestsAPI.reject(rejectTarget);
      toast.success('Request rejected', `${rejectTarget.name || rejectTarget.email} remains blocked`);
      setRejectTarget(null);
      fetchRequests();
      notifyChanged();  // refreshes the pending-count badge
    } catch (err) {
      toast.error('Rejection failed', err.response?.data?.detail);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Access Requests</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Approve or reject users waiting for access to PricePilot AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchRequests} className="btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="badge badge-warning flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`badge cursor-pointer transition-all hover:opacity-80 ${tab === t.key ? t.badge : 'badge-neutral'}`}
          >
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">Requester</th>
                <th className="table-header">Provider</th>
                <th className="table-header">Requested Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Requested</th>
                <th className="table-header">Reviewed</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Inbox className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      No {tab === 'all' ? '' : tab + ' '}access requests found
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {(req.name || req.email)[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">{req.name || req.email}</p>
                          <p className="text-xs text-surface-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {req.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <ProviderBadge provider={req.provider} />
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-surface-400" />
                        <span className="text-sm text-surface-700 dark:text-surface-300 capitalize">
                          {(req.requested_role || 'data_analyst').replace('_', ' ')}
                        </span>
                      </div>
                      {req.reason && (
                        <p className="text-[11px] text-surface-400 mt-1 flex items-center gap-1 max-w-[220px] truncate" title={req.reason}>
                          <MessageSquare className="w-3 h-3 flex-shrink-0" />
                          {req.reason}
                        </p>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${STATUS_BADGE[req.status] || 'badge-neutral'}`}>{req.status}</span>
                    </td>
                    <td className="table-cell text-xs text-surface-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </td>
                    <td className="table-cell text-xs text-surface-400">
                      {req.reviewed_at ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.reviewed_at).toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-surface-300 dark:text-surface-600">—</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openApprove(req)}
                            className="btn-ghost btn-sm p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            title="Approve request"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejectTarget(req)}
                            className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Reject request"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-surface-300 dark:text-surface-600">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve modal */}
      {approveTarget && (
        <div className="modal-overlay" onClick={() => setApproveTarget(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Approve Access Request
              </h2>
              <button onClick={() => setApproveTarget(null)} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Grant <span className="font-semibold text-surface-900 dark:text-white">{approveTarget.name || approveTarget.email}</span> access to PricePilot AI.
                The user will be able to sign in immediately with their existing credentials.
              </p>
              <div>
                <label className="label">Assign Role</label>
                <select
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="data_analyst">Data Analyst</option>
                  <option value="pricing_manager">Pricing Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setApproveTarget(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleApprove} disabled={approving} className="btn-primary">
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve & Grant Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirm */}
      <ConfirmDialog
        open={rejectTarget !== null}
        title="Reject access request?"
        message={`${rejectTarget?.name || rejectTarget?.email} will remain blocked from PricePilot AI. They will see a rejection message if they try to sign in.`}
        confirmLabel="Reject Request"
        loading={rejecting}
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
