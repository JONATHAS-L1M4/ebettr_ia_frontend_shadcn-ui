import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, FileQuestion, Home } from '../components/ui/Icons';
import DarkPage from '../components/layout/DarkPage';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DarkPage className="min-h-screen">
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center animate-fade-in">
      <div className="bg-card p-8 md:p-12 rounded-2xl shadow-sm border border-border max-w-md w-full flex flex-col items-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 text-muted-foreground">
          <FileQuestion className="w-10 h-10" />
        </div>
        
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">Página não encontrada</h2>
        
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Ops! A página que você está procurando parece ter sido movida, excluída ou nunca existiu.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button 
            onClick={() => navigate(-1)}
            className="flex h-10 flex-1 items-center justify-center gap-2 px-4 py-2 border border-border text-muted-foreground font-medium rounded-lg hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          
          <button 
            onClick={() => navigate('/agents')}
            className="flex h-10 flex-1 items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Ir para Início
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-xs text-muted-foreground font-mono">
        Error Code: 404_NOT_FOUND
      </div>
    </div>
    </DarkPage>
  );
};

export default NotFound;
