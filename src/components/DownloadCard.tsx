import { useState } from 'react'
import { DownloadItem } from '../store/downloadStore'
import { FileVideo, CheckCircle, AlertCircle, Loader2, Play, Pause, X, Trash2, Folder, LogIn, RefreshCw, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

interface DownloadCardProps {
    item: DownloadItem;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
    onOpenFolder?: (path: string) => void;
    onLogin?: () => void;
    onRetry?: (item: DownloadItem) => void;
}

export function DownloadCard({ item, onPause, onResume, onCancel, onOpenFolder, onLogin, onRetry }: DownloadCardProps) {
    const [showConsent, setShowConsent] = useState(false);
    
    const isPaused = item.status === 'paused';
    const isDownloading = item.status === 'downloading';
    const isConverting = item.status === 'converting';
    const isPending = item.status === 'pending';
    const isError = item.status === 'error';
    const isCompleted = item.status === 'completed';

    // Detection logic for access/block errors
    const isBlockError = isError && (
        item.error?.includes('ACESSO') || 
        item.error?.includes('VERIFICAÇÃO') ||
        item.error?.includes('login') || 
        item.error?.includes('cookies') ||
        item.url.includes('youtube.com') ||
        item.url.includes('youtu.be')
    );
    return (
        <div className="bg-card border border-border rounded-lg p-4 flex items-center space-x-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={cn("p-2 rounded-full border-2", {
                "bg-blue-500/10 text-blue-500 border-blue-500/20": item.status === 'downloading',
                "bg-purple-500/10 text-purple-500 border-purple-500/20": item.status === 'converting',
                "bg-yellow-500/10 text-yellow-500 border-yellow-500/20": item.status === 'paused',
                "bg-green-500/10 text-green-500 border-green-500/20": item.status === 'completed',
                "bg-red-500/10 text-red-500 border-red-500/50": item.status === 'error',
                "bg-muted text-muted-foreground border-transparent": item.status === 'pending',
            })}>
                {(item.status === 'downloading' || item.status === 'converting') && <Loader2 className="w-6 h-6 animate-spin" />}
                {item.status === 'paused' && <Pause className="w-6 h-6" />}
                {item.status === 'completed' && <CheckCircle className="w-6 h-6" />}
                {item.status === 'error' && <AlertCircle className="w-6 h-6" />}
                {item.status === 'pending' && <FileVideo className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 lg:col-span-6">
                    <h3 className="font-semibold text-sm truncate" title={item.filename}>{item.filename}</h3>
                    {item.status === 'downloading' && (
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-2">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                style={{ width: `${parseFloat(item.progress) || 0}%` }}
                            />
                        </div>
                    )}
                    {isError && item.error && (
                        <div className="mt-2 space-y-2 max-w-md">
                            {/* Mensagem de Erro Clara */}
                            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs text-red-500 font-bold leading-tight">
                                        {item.error}
                                    </p>
                                </div>
                            </div>

                            {/* Fluxo de Consentimento: Pergunta clara ao usuário */}
                            {isBlockError && !showConsent && (
                                <div className="p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-md space-y-2">
                                    <p className="text-[11px] text-blue-400 font-medium leading-tight">
                                        O download falhou por restrição. Deseja usar os cookies do seu navegador (Chrome/Firefox) para resolver?
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                window.api?.enableCookies();
                                                setShowConsent(true);
                                            }}
                                            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded transition-colors"
                                        >
                                            Sim, usar cookies
                                        </button>
                                        <button 
                                            onClick={() => onRetry?.(item)}
                                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-medium rounded transition-colors"
                                        >
                                            Não
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Caixa de Ação: Só aparece se o usuário aceitou (showConsent === true) */}
                            {isBlockError && showConsent && (
                                <div className="p-3 bg-zinc-900/90 border border-emerald-500/30 rounded-lg flex flex-col gap-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold">Cookies Ativados!</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                                        O app agora tentará ler os cookies do seu navegador. 
                                        Certifique-se de estar logado no YouTube no Chrome ou Firefox.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => onRetry?.(item)}
                                            className="w-full px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-[11px] font-bold shadow-lg"
                                        >
                                            Tentar Agora com Cookies
                                        </button>

                                        <button
                                            onClick={() => {
                                                window.api?.resetCookies();
                                                onRetry?.(item);
                                            }}
                                            className="w-full px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all text-[10px] font-medium border border-zinc-700"
                                        >
                                            Tentar SEM Cookies (Limpar)
                                        </button>
                                        
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="h-[1px] flex-1 bg-zinc-800" />
                                            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Se ainda falhar</span>
                                            <div className="h-[1px] flex-1 bg-zinc-800" />
                                        </div>

                                        <button
                                            onClick={() => {
                                                onLogin?.();
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all text-[10px] font-medium border border-zinc-700"
                                        >
                                            <LogIn className="w-3 h-3" />
                                            Abrir YouTube para Logar
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setShowConsent(false)}
                                        className="text-[10px] text-zinc-500 hover:text-zinc-400 underline underline-offset-2 text-center"
                                    >
                                        Voltar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 truncate">{item.url}</p>
                </div>

                <div className="col-span-2 hidden lg:block text-sm text-right">
                    <span className="text-muted-foreground">Size:</span> {item.totalSize || '--'}
                </div>

                <div className="col-span-2 hidden lg:block text-sm text-right">
                    {item.status === 'downloading' && (
                        <>
                            <div className="font-mono text-emerald-500">{item.speed}</div>
                            <div className="text-xs text-muted-foreground">ETA: {item.eta || '--'}</div>
                        </>
                    )}
                </div>

                <div className="col-span-2 text-right flex justify-end gap-2">
                    {/* Retry Button for Errors (Simplified for general errors) */}
                    {isError && onRetry && !isBlockError && (
                        <button
                            onClick={() => onRetry(item)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors text-xs font-bold border border-blue-500/20"
                            title="Tentar novamente"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Tentar Novamente</span>
                        </button>
                    )}

                    {/* Login Button (Moved inside the interactive error box) */}
                    {/* {needsLogin && (
                        <button
                            onClick={onLogin}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-bold border border-red-500/20"
                            title="Abrir navegador para Login"
                        >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Fazer Login</span>
                        </button>
                    )} */}

                    {/* Pause/Resume for Downloading/Paused states */}
                    {(isDownloading || isPaused || isPending) && (
                        <button
                            onClick={() => isPaused ? onResume(item.id) : onPause(item.id)}
                            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title={isPaused ? "Retomar" : "Pausar"}
                        >
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Open Folder */}
                    {item.outputDir && (
                        <button
                            onClick={() => onOpenFolder?.(item.outputDir!)}
                            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Abrir Pasta"
                        >
                            <Folder className="w-4 h-4" />
                        </button>
                    )}

                    {/* Cancel/Delete */}
                    <button
                        onClick={() => onCancel(item.id)}
                        className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title={isCompleted ? "Remover" : "Cancelar"}
                    >
                        {isCompleted ? <Trash2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>

                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full hidden lg:inline-block", {
                        "bg-blue-500/20 text-blue-400": isDownloading,
                        "bg-purple-500/20 text-purple-400": isConverting,
                        "bg-yellow-500/20 text-yellow-400": isPaused,
                        "bg-green-500/20 text-green-400": isCompleted,
                        "bg-zinc-500/20 text-zinc-400": isPending,
                        "bg-red-500/20 text-red-400": isError,
                    })}>
                        {isDownloading ? `${item.progress}%` : isConverting ? 'Converting...' : item.status}
                    </span>
                </div>
            </div>
        </div>
    )
}
