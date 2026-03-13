import React, { useEffect, useMemo, useState } from 'react';
import { ConfigField } from '../../types';
import {
  fetchN8nCredentialSchema,
  testN8nCredential,
} from '../../services/n8nService';
import {
  Loader2,
  Save,
  Key,
  AlertCircle,
  CircleHelp,
  X,
  Zap,
  Check,
  AlertTriangle,
} from '../ui/Icons';
import { TextField } from '../inputs/TextField';
import { SelectField } from '../inputs/SelectField';
import { SwitchField } from '../inputs/SwitchField';
import { NumberField } from '../inputs/NumberField';
import { TextAreaField } from '../inputs/TextAreaField';
import { useNotification } from '../../context/NotificationContext';
import { deepSortKeys } from '../../utils/credentialJsonOutput';

interface CredentialFormProps {
  workflowId: string;
  credentialType: string;
  credentialName?: string;
  credentialId?: string;
  credentialNodeName?: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function toArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

function looseEq(a: any, b: any) {
  if (a === b) return true;
  if (
    (typeof a === 'number' || typeof a === 'string') &&
    (typeof b === 'number' || typeof b === 'string')
  ) {
    return String(a) === String(b);
  }
  return false;
}

function shouldShowField(
  field: ConfigField,
  values: Record<string, any>,
  getValue: (key: string) => any
) {
  if (!field) return false;
  if (field.type === 'hidden') return false;

  const display = field.n8nDisplayOptions || {};
  const show = display.show || null;
  const hide = display.hide || null;

  if (show) {
    const ok = Object.entries(show).every(([dep, allowed]) => {
      const depVal = getValue(dep);
      return toArray(allowed).some((a) => looseEq(depVal, a));
    });
    if (!ok) return false;
  }

  if (hide) {
    const blocked = Object.entries(hide).some(([dep, disallowed]) => {
      const depVal = getValue(dep);
      return toArray(disallowed).some((d) => looseEq(depVal, d));
    });
    if (blocked) return false;
  }

  return true;
}

function sanitizePayload(
  schema: ConfigField[],
  values: Record<string, any>,
  getValue: (key: string) => any,
  getFieldKey: (f: ConfigField) => string
) {
  const output: Record<string, any> = {};

  schema.forEach((field) => {
    if (
      !field ||
      field.type === 'hidden' ||
      field.type === 'notice' ||
      field.id === 'notice'
    ) {
      return;
    }
    if (!shouldShowField(field, values, getValue)) return;

    const key = getFieldKey(field);
    const val = values[key];

    if (val === '' || val === undefined || val === null) return;
    if (Array.isArray(val) && val.length === 0) return;
    if (
      (field.type === 'switch' || field.type === 'checkbox') &&
      val === false
    ) {
      return;
    }

    output[key] = val;
  });

  return output;
}

export const CredentialForm: React.FC<CredentialFormProps> = ({
  workflowId,
  credentialType,
  credentialName,
  credentialId,
  credentialNodeName,
  onSave,
  onCancel,
}) => {
  const { addNotification } = useNotification();
  const [fields, setFields] = useState<ConfigField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- SMART TEST STATUS ---
  type TestStatus = 'idle' | 'testing' | 'success' | 'error';
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');

  const [activeHelp, setActiveHelp] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const getFieldKey = (f: ConfigField) => f.id || '';
  const getValue = (key: string) => values[key];

  const [dummySecrets, setDummySecrets] = useState<Record<string, string>>({});

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  const getCacheKey = () =>
    `ebettr_cred_cache_${credentialId || 'new'}_${credentialType}`;

  const loadCache = () => {
    try {
      const item = localStorage.getItem(getCacheKey());
      return item ? JSON.parse(item) : {};
    } catch {
      return {};
    }
  };

  const saveCache = (data: Record<string, any>) => {
    try {
      // Filtra segredos antes de salvar no cache
      const safeData: Record<string, any> = {};
      Object.keys(data).forEach((key) => {
        if (!dummySecrets[key]) {
          safeData[key] = data[key];
        }
      });
      localStorage.setItem(getCacheKey(), JSON.stringify(safeData));
    } catch {}
  };

  useEffect(() => {
    let mounted = true;

    const loadSchema = async () => {
      setLoading(true);
      setError('');

      try {
        const { fields: schemaFields, defaults: defaultValues } =
          await fetchN8nCredentialSchema(credentialType);

        if (!mounted) return;

        setFields(schemaFields);

        const cachedData = loadCache();
        const nextValues: Record<string, any> = { ...(defaultValues || {}) };
        const nextDummies: Record<string, string> = {};

        schemaFields.forEach((f) => {
          const key = getFieldKey(f);
          const isSecret = f.n8nTypeOptions?.password || f.secret;

          if (isSecret && credentialId) {
            // Se for credencial existente e campo secreto, gera dummy
            const dummy = `secret_${generateUUID()}`;
            nextDummies[key] = dummy;
            nextValues[key] = dummy;
          } else {
            // Se tiver cache, usa. Senão, usa defaults ou valor do schema.
            if (cachedData[key] !== undefined) {
              nextValues[key] = cachedData[key];
            } else if (nextValues[key] === undefined) {
              if (f.value !== undefined) nextValues[key] = f.value;
              else if (f.defaultValue !== undefined) {
                nextValues[key] = f.defaultValue;
              }
            }
          }
        });

        setDummySecrets(nextDummies);
        setValues(nextValues);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Falha ao carregar definição.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (credentialType) loadSchema();

    return () => {
      mounted = false;
    };
  }, [credentialType, credentialId]);

  const handleChange = (id: string, val: any) => {
    setValues((prev) => {
      const newValues = { ...prev, [id]: val };

      // Salva no cache a cada mudança (debounce idealmente, mas direto aqui para simplicidade)
      saveCache(newValues);
      return newValues;
    });

    if (testStatus !== 'idle') setTestStatus('idle');
  };

  const payload = useMemo(() => {
    const rawPayload = sanitizePayload(fields, values, getValue, getFieldKey);

    // Remove campos que ainda são dummy secrets (não foram alterados)
    if (rawPayload) {
      Object.keys(rawPayload).forEach((key) => {
        if (dummySecrets[key] && rawPayload[key] === dummySecrets[key]) {
          delete rawPayload[key];
        }
      });
    }

    return rawPayload;
  }, [fields, values, dummySecrets]);

  const handleTestConnection = async () => {
    if (testStatus === 'testing') return;

    setTestStatus('testing');

    try {
      const result = await testN8nCredential(workflowId, {
        id: credentialId,
        name: credentialName,
        type: credentialType,
        data: deepSortKeys(payload),
      });

      if (result.status === 'OK') {
        setTestStatus('success');
        addNotification(
          'success',
          'Conexão Ativa',
          'Credenciais validadas com sucesso.'
        );
        setTimeout(() => setTestStatus('idle'), 4000);
      } else {
        setTestStatus('error');
        addNotification(
          'error',
          'Erro de Conexão',
          result.message || 'Verifique os dados.'
        );
        setTimeout(() => setTestStatus('idle'), 4000);
      }
    } catch (e: any) {
      setTestStatus('error');
      addNotification('error', 'Falha no Teste', e.message);
      setTimeout(() => setTestStatus('idle'), 4000);
    }
  };

  const renderTestButton = () => {
    const baseClass =
      'h-10 px-4 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-sm active:scale-95';

    if (testStatus === 'testing') {
      return (
        <button
          disabled
          className={`${baseClass} bg-muted text-foreground border border-border cursor-wait`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Testando</span>
        </button>
      );
    }

    if (testStatus === 'success') {
      return (
        <button
          disabled
          className={`${baseClass} bg-foreground text-background border border-foreground/40 animate-scale-in`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Conectado</span>
        </button>
      );
    }

    if (testStatus === 'error') {
      return (
        <button
          disabled
          className={`${baseClass} bg-red-700 text-red-50 border border-red-600 animate-[shake_0.4s_ease-in-out]`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Falhou</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleTestConnection}
        className={`${baseClass} bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span>Testar Conexão</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center py-12">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Preparando formulário...
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-3px); } 40% { transform: translateX(3px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
      `}</style>

      <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-border bg-card p-2">
              <Key className="h-5 w-5 text-muted-foreground" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground">
                Configurar Credencial
              </h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {credentialType}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <form
            id="credential-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(deepSortKeys(payload));
            }}
            className="space-y-6"
          >
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="space-y-5">
              {fields.map((field) => {
                const key = getFieldKey(field);

                if (!shouldShowField(field, values, getValue)) return null;

                if (field.type === 'notice') {
                  return (
                    <div
                      key={key}
                      className="animate-fade-in rounded-md border border-border bg-muted p-4 text-xs leading-relaxed text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: field.label }}
                    />
                  );
                }

                const isSecret = field.secret || field.n8nTypeOptions?.password;
                const fieldProps = {
                  ...field,
                  value: values[key],
                  type: isSecret ? ('password' as const) : field.type,
                };

                return (
                  <div key={key} className="animate-fade-in space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {field.label}{' '}
                        {field.required && (
                          <span className="text-red-400">*</span>
                        )}
                      </label>

                      {field.helpText && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveHelp({
                              title: field.label,
                              text: field.helpText!,
                            })
                          }
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {field.type === 'select' ? (
                      <SelectField
                        field={fieldProps as any}
                        onChange={(v) => handleChange(key, v)}
                      />
                    ) : field.type === 'switch' ? (
                      <SwitchField
                        field={fieldProps as any}
                        onChange={(v) => handleChange(key, v)}
                      />
                    ) : field.type === 'textarea' ? (
                      <TextAreaField
                        field={fieldProps as any}
                        onChange={(v) => handleChange(key, v)}
                      />
                    ) : field.type === 'number_int' ||
                      field.type === 'number_dec' ? (
                      <NumberField
                        field={fieldProps as any}
                        onChange={(v) => handleChange(key, v)}
                      />
                    ) : (
                      <TextField
                        field={fieldProps as any}
                        onChange={(v) => handleChange(key, v)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </form>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-between gap-4 border-t border-border bg-muted px-6 py-4 sm:flex-row">
          <div className="w-full sm:w-auto">{renderTestButton()}</div>

          <div className="flex w-full gap-3 sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground sm:flex-none"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="credential-form"
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground sm:flex-none"
            >
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </div>
        </div>
      </div>

      {activeHelp && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/68 p-4 backdrop-blur-[1.5px] animate-fade-in"
          onClick={() => setActiveHelp(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-[#101010] shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-muted p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                Informação
              </h3>
              <button
                onClick={() => setActiveHelp(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {activeHelp.title}
              </p>
              <div
                className="text-sm leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: activeHelp.text }}
              />
            </div>

            <div className="border-t border-border bg-muted p-4">
              <button
                onClick={() => setActiveHelp(null)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted hover:text-foreground"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
