import { useEffect, useRef, useState } from 'react';
import {
  lerPerfilMestre,
  renomearPerfilMestre,
  restaurarBackup,
  type BackupPreparado,
  type PerfilMestre,
} from './backupMestre';
import {
  escolherDestinoBackup,
  prepararBackupStreaming,
  salvarBackupStreaming,
} from './backupStreaming';
import './PerfilBackup.css';

export default function PerfilBackup() {
  const [perfil, setPerfil] = useState<PerfilMestre | null>(null);
  const [nome, setNome] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [arquivo, setArquivo] = useState<BackupPreparado | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [confirmacao, setConfirmacao] = useState('');
  const arquivoRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const current = lerPerfilMestre();
      setPerfil(current);
      setNome(current.nome);
    } catch (e) {
      setErro(String(e));
    }
  }, []);
  const resetAvisos = () => {
    setErro('');
    setMensagem('');
  };
  const salvarNome = () => {
    resetAvisos();
    try {
      const p = renomearPerfilMestre(nome);
      setPerfil(p);
      setNome(p.nome);
      setMensagem('Nome do perfil salvo neste navegador.');
    } catch (e) {
      setErro(String(e));
    }
  };
  const exportar = async () => {
    if (!perfil || ocupado) return;
    resetAvisos();
    setOcupado(true);
    setProgresso(null);
    // O diálogo do sistema precisa abrir diretamente no gesto do usuário.
    try {
      const destino = escolherDestinoBackup(perfil);
      const manifesto = await salvarBackupStreaming(perfil, destino, (etapa, valor) => {
        setMensagem(etapa);
        setProgresso(valor ?? null);
      });
      setMensagem(
        `Backup finalizado: ${manifesto.resumo.campanhas} campanha(s), ${manifesto.resumo.fichas} ficha(s), ${manifesto.resumo.cadernos} caderno(s) e ${manifesto.resumo.arquivos} recurso(s) locais. Guarde o ZIP fora do navegador.`,
      );
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError')
        setMensagem('Exportação cancelada. Nenhum dado foi alterado.');
      else setErro(`Não foi possível gerar o backup: ${String(e)}`);
    } finally {
      setOcupado(false);
      setProgresso(null);
    }
  };
  const carregar = async (f?: File) => {
    setArquivo(null);
    setConfirmacao('');
    resetAvisos();
    if (!f) return;
    setOcupado(true);
    setProgresso(null);
    try {
      const prepared = await prepararBackupStreaming(f, (etapa, valor) => {
        setMensagem(etapa);
        setProgresso(valor ?? null);
      });
      setArquivo(prepared);
      setMensagem('Integridade verificada. Confira o conteúdo antes de restaurar.');
    } catch (e) {
      setErro(`Backup não aceito: ${String(e)}`);
    } finally {
      setOcupado(false);
      setProgresso(null);
    }
  };
  const restaurar = async () => {
    if (!arquivo || confirmacao.trim().toUpperCase() !== 'RESTAURAR' || ocupado) return;
    resetAvisos();
    setOcupado(true);
    try {
      await restaurarBackup(arquivo);
      setArquivo(null);
      setConfirmacao('');
      setMensagem(
        'Dados restaurados. A página será atualizada para carregar as campanhas e bibliotecas restauradas.',
      );
      // Recarregamento só ocorre após confirmação do commit no armazenamento.
      window.location.reload();
    } catch (e) {
      setErro(String(e));
    } finally {
      setOcupado(false);
    }
  };
  return (
    <section className="gm-backup" aria-labelledby="gm-backup-title">
      <div className="gm-backup-heading">
        <div>
          <span className="hp-eyebrow">DADOS LOCAIS · PERFIL PERSISTENTE</span>
          <h1 id="gm-backup-title">
            Perfil do <em>Mestre.</em>
          </h1>
          <p>
            Suas campanhas pertencem a este navegador até você exportar um backup. Jogadores
            convidados não precisam de perfil permanente.
          </p>
        </div>
        <div className="gm-backup-emblem" aria-hidden="true">
          ✥
        </div>
      </div>
      {erro && (
        <div className="gm-backup-alert gm-backup-error" role="alert">
          {erro}
        </div>
      )}
      {mensagem && (
        <div className="gm-backup-alert" role="status">
          {mensagem}
          {progresso !== null ? ` (${progresso}%)` : ''}
        </div>
      )}
      <div className="gm-backup-columns">
        <article className="gm-backup-panel">
          <span className="hp-eyebrow">01 · IDENTIDADE</span>
          <h2>Meu perfil local</h2>
          <p>Um único perfil de mestre nesta instalação. Não exige e-mail, cadastro ou senha.</p>
          <label htmlFor="gm-backup-name">Nome de exibição</label>
          <div className="gm-backup-name-row">
            <input
              id="gm-backup-name"
              value={nome}
              maxLength={70}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do mestre"
            />
            <button
              type="button"
              onClick={salvarNome}
              disabled={!perfil || ocupado || !nome.trim()}
            >
              Salvar
            </button>
          </div>
          <small>
            Identificador local: {perfil?.id.slice(0, 12) || '—'} · Criado em{' '}
            {perfil ? new Date(perfil.criadoEm).toLocaleDateString('pt-BR') : '—'}
          </small>
        </article>
        <article className="gm-backup-panel gm-backup-export">
          <span className="hp-eyebrow">02 · PROTEÇÃO DOS DADOS</span>
          <h2>Exportar backup completo</h2>
          <p>
            Salva campanhas, mesas, mapas e arquivos locais, cadernos, fichas, rascunhos, dados
            personalizados e configurações em um único ZIP.
          </p>
          <button
            type="button"
            className="hp-button hp-button-primary"
            onClick={() => void exportar()}
            disabled={!perfil || ocupado}
          >
            {ocupado ? 'Processando…' : '↓ Fazer backup agora'}
          </button>
          <small>
            Para backups grandes, Chrome ou Edge atualizado grava o ZIP diretamente no disco. Em
            outros navegadores, o download é limitado a 180 MB para evitar travamentos. O conteúdo
            não é criptografado.
          </small>
        </article>
      </div>
      <article className="gm-backup-panel gm-backup-restore">
        <span className="hp-eyebrow">03 · RESTAURAÇÃO</span>
        <h2>Restaurar um perfil</h2>
        <p>
          Compatível com backups antigos e novos. Antes de restaurar, o Portal verifica a
          integridade de todos os arquivos. A restauração{' '}
          <strong>substitui os dados locais do Portal do Mestre</strong> por aqueles do backup,
          incluindo as bibliotecas e a identidade do perfil.
        </p>
        <input
          ref={arquivoRef}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={(e) => {
            void carregar(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="gm-backup-pick"
          disabled={ocupado}
          onClick={() => arquivoRef.current?.click()}
        >
          ↑ Escolher arquivo ZIP
        </button>
        {arquivo && (
          <div className="gm-backup-preview">
            <div>
              <span className="hp-eyebrow">BACKUP VALIDADO</span>
              <h3>{arquivo.manifesto.perfil.nome}</h3>
              <p>Exportado em {new Date(arquivo.manifesto.exportadoEm).toLocaleString('pt-BR')}</p>
            </div>
            <div className="gm-backup-counts">
              {(
                [
                  ['Campanhas', arquivo.manifesto.resumo.campanhas],
                  ['Fichas', arquivo.manifesto.resumo.fichas],
                  ['Cadernos', arquivo.manifesto.resumo.cadernos],
                  ['Dados', arquivo.manifesto.resumo.dados],
                  ['Conjuntos', arquivo.manifesto.resumo.colecoes],
                  ['Arquivos', arquivo.manifesto.resumo.arquivos],
                  [
                    'Miniaturas 3D',
                    (() => {
                      try {
                        const items = JSON.parse(
                          arquivo.snapshot.local['portal-mestre-biblioteca-miniaturas3d-v1'] ||
                            '[]',
                        );
                        return Array.isArray(items) ? items.length : 0;
                      } catch {
                        return 0;
                      }
                    })(),
                  ],
                ] as const
              ).map(([label, n]) => (
                <div key={label}>
                  <strong>{n}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="gm-backup-confirm">
              <p>
                <strong>Atenção:</strong> as campanhas e os dados atuais serão substituídos. Faça um
                backup do estado atual antes de continuar e feche outras abas do Portal.
              </p>
              <label htmlFor="gm-restore-word">
                Digite <strong>RESTAURAR</strong> para confirmar
              </label>
              <input
                id="gm-restore-word"
                autoComplete="off"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="RESTAURAR"
              />
              <div className="gm-backup-actions">
                <button
                  type="button"
                  onClick={() => {
                    setArquivo(null);
                    setConfirmacao('');
                    resetAvisos();
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="gm-backup-danger"
                  onClick={() => void restaurar()}
                  disabled={ocupado || confirmacao.trim().toUpperCase() !== 'RESTAURAR'}
                >
                  {ocupado ? 'Restaurando…' : 'Restaurar e substituir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </article>
      <p className="gm-backup-footnote">
        Feche outras abas da mesa antes de exportar ou restaurar. Faça sempre o teste de restauração
        em um perfil separado antes de depender exclusivamente deste arquivo. O backup inclui
        recursos realmente salvos neste navegador. Links para arquivos externos, serviços online e
        arquivos que ainda estejam apenas no computador não são incorporados automaticamente. Não é
        sincronização em nuvem nem substitui manter uma cópia de segurança fora do PC.
      </p>
    </section>
  );
}
