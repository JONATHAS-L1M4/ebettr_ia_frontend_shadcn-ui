import React, { useState, useRef, useEffect } from 'react';
import { ConfigSection } from '../../types';
import {
  Settings,
  Brain,
  MessageSquare,
  Shield,
  Database,
  Cpu,
  Code,
  Cloud,
  Zap,
  Globe,
  Activity,
  Terminal,
  Key,
  Lock,
  Layers,
  Box,
  User,
  Mail,
  LayoutGrid,
} from '../ui/Icons';

const inputBaseClass =
  'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50';
const controlBaseClass =
  'w-full px-3 py-2 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm placeholder:text-muted-foreground shadow-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50';

interface ModuleSettingsProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  icon: ConfigSection['icon'];
  setIcon: (val: ConfigSection['icon']) => void;
  width?: '33%' | '66%' | '100%';
  setWidth?: (val: '33%' | '66%' | '100%') => void;
}

const ICON_MAP = {
  settings: Settings,
  brain: Brain,
  message: MessageSquare,
  database: Database,
  shield: Shield,
  cpu: Cpu,
  code: Code,
  cloud: Cloud,
  zap: Zap,
  globe: Globe,
  activity: Activity,
  terminal: Terminal,
  key: Key,
  lock: Lock,
  layers: Layers,
  box: Box,
  user: User,
  mail: Mail,
};

export const ModuleSettings: React.FC<ModuleSettingsProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  icon,
  setIcon,
  width = '33%',
  setWidth,
}) => {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setIsIconPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [description]);

  const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1';
  const getWidthTabClass = (isActive: boolean) =>
    [
      'flex flex-1 h-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ease-out',
      isActive
        ? 'bg-[#202020] text-foreground shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)]'
        : 'text-muted-foreground hover:bg-card/85 hover:text-foreground'
    ].join(' ');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Settings className="w-4 h-4 text-foreground" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Detalhes do Modulo</h3>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className={labelClass}>Titulo</label>
            <span className="text-[10px] text-muted-foreground font-mono">{title.length}/60</span>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} className={inputBaseClass} placeholder="Ex: Dados do Lead" />
        </div>

        <div className="space-y-1 relative" ref={iconPickerRef}>
          <label className={labelClass}>Icone</label>
          <button
            onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
            className="w-10 h-[34px] border border-border rounded-md flex items-center justify-center hover:border-ring/40 hover:bg-accent transition-all"
          >
            {React.createElement(ICON_MAP[icon], { className: 'w-5 h-5 text-foreground' })}
          </button>

          {isIconPickerOpen && (
            <div className="absolute top-full right-0 mt-2 bg-popover border border-border shadow-xl rounded-lg p-3 z-50 w-64 grid grid-cols-6 gap-2 animate-scale-in">
              {Object.entries(ICON_MAP).map(([key, IconComp]) => (
                <button
                  key={key}
                  onClick={() => {
                    setIcon(key as any);
                    setIsIconPickerOpen(false);
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                    icon === key
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className={labelClass}>Descricao</label>
          <span className="text-[10px] text-muted-foreground font-mono">{description.length}/300</span>
        </div>
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={300}
          rows={2}
          className={`${controlBaseClass} resize-none overflow-hidden`}
          placeholder="Breve descricao do proposito deste modulo..."
        />
      </div>

      {setWidth && (
        <div className="space-y-1">
          <label className={labelClass}>
            <LayoutGrid className="w-3 h-3" /> Largura Padrao
          </label>
          <div className="flex h-[36px] w-full items-center gap-2 rounded-lg bg-muted/60 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setWidth('33%')}
              className={getWidthTabClass(width === '33%')}
            >
              33% (1/3)
            </button>
            <button
              type="button"
              onClick={() => setWidth('66%')}
              className={getWidthTabClass(width === '66%')}
            >
              66% (2/3)
            </button>
            <button
              type="button"
              onClick={() => setWidth('100%')}
              className={getWidthTabClass(width === '100%')}
            >
              100% (Full)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
