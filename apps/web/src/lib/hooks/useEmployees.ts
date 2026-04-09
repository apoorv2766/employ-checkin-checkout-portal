'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { employeesApi } from '../api/endpoints';
import { toast } from '../store/toast.store';

type ApiError = { response?: { data?: { error?: { message?: string } } } };
const apiMsg = (err: unknown, fallback: string) =>
  (err as ApiError)?.response?.data?.error?.message ?? fallback;

export function useEmployees(params: Record<string, string | number | undefined> = {}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async () => {
      const res = await employeesApi.list(params);
      return res.data as { data: unknown[]; pagination: unknown };
    },
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: async () => {
      const res = await employeesApi.getById(id);
      return res.data.data as Record<string, unknown>;
    },
    enabled: !!id,
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['employees', 'me'],
    queryFn: async () => {
      const res = await employeesApi.getMe();
      return res.data.data as Record<string, unknown>;
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => employeesApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully');
    },
    onError: (err) => toast.error(apiMsg(err, 'Failed to create employee')),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      employeesApi.update(id, data),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['employees', vars.id] });
      void qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
    },
    onError: (err) => toast.error(apiMsg(err, 'Failed to update employee')),
  });
}

export function useDeactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deactivated');
    },
    onError: (err) => toast.error(apiMsg(err, 'Failed to deactivate employee')),
  });
}

export function useReactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.reactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee reactivated');
    },
    onError: (err) => toast.error(apiMsg(err, 'Failed to reactivate employee')),
  });
}

export function useUnlockAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeesApi.unlock(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Account unlocked successfully');
    },
    onError: (err) => toast.error(apiMsg(err, 'Failed to unlock account')),
  });
}

export function useAdminChangePassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      employeesApi.adminChangePassword(id, newPassword),
    onSuccess: () => toast.success('Password changed successfully'),
    onError: (err) => toast.error(apiMsg(err, 'Failed to change password')),
  });
}
