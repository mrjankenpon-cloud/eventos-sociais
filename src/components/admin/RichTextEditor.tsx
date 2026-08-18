import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import {
  Color,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle,
} from '@tiptap/extension-text-style';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Image as ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ensureStoredImage } from '../../services/firebase/storage';
import { imagensService } from '../../services/firebase/imagens';

const FONT_FAMILIES = [
  { label: 'Padrão do site', value: '' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'];

const LINE_HEIGHTS = [
  { label: 'Simples', value: '1.4' },
  { label: '1,5 linha', value: '1.65' },
  { label: 'Duplo', value: '2' },
];

const BLOCK_OPTIONS = [
  { label: 'Texto normal', value: 'paragraph' },
  { label: 'Título 1', value: 'h1' },
  { label: 'Título 2', value: 'h2' },
  { label: 'Título 3', value: 'h3' },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Rótulo acessível do documento. */
  label?: string;
}

/** Editor de página no estilo processador de texto (negrito, fontes, imagens). */
export function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer' },
        },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'site-content-doc focus:outline-none min-h-[40vh] sm:min-h-[55vh] lg:min-h-[60vh]',
        'aria-label': label ?? 'Conteúdo da página',
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  // Troca de aba/página: recarrega o documento sem perder o cursor ao digitar.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, label]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Endereço do link (URL):', previous ?? 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [editor]);

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      setUploadError(null);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
          reader.readAsDataURL(file);
        });
        const stored = await ensureStoredImage(dataUrl, 'configuracoes');
        // Referência interna precisa virar URL exibível no HTML salvo.
        const src = stored.startsWith('img:')
          ? await imagensService.resolve(stored)
          : stored;
        if (!src) throw new Error('Imagem não pôde ser preparada');
        editor.chain().focus().setImage({ src }).run();
      } catch (error) {
        console.error('[RichTextEditor.image]', error);
        setUploadError(
          error instanceof Error
            ? error.message
            : 'Não foi possível inserir a imagem.'
        );
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="card-surface p-6 text-sm text-gray-400">
        Carregando editor...
      </div>
    );
  }

  const currentBlock = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'paragraph';

  return (
    <div className="card-surface overflow-hidden">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-gray-100 bg-white/95 backdrop-blur px-2.5 py-2">
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Desfazer"
        >
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Refazer"
        >
          <Redo2 size={16} />
        </ToolButton>

        <Divider />

        <select
          aria-label="Estilo do parágrafo"
          value={currentBlock}
          onChange={(e) => {
            const next = e.target.value;
            const chain = editor.chain().focus();
            if (next === 'paragraph') chain.setParagraph().run();
            else chain.setHeading({ level: Number(next.slice(1)) as 1 | 2 | 3 }).run();
          }}
          className="h-8 rounded-lg border border-gray-100 bg-gray-50 px-2 text-xs font-bold text-gray-700"
        >
          {BLOCK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Fonte"
          value={(editor.getAttributes('textStyle').fontFamily as string) ?? ''}
          onChange={(e) => {
            const family = e.target.value;
            if (!family) editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(family).run();
          }}
          className="h-8 rounded-lg border border-gray-100 bg-gray-50 px-2 text-xs font-bold text-gray-700 max-w-[9rem]"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Tamanho da letra"
          value={(editor.getAttributes('textStyle').fontSize as string) ?? ''}
          onChange={(e) => {
            const size = e.target.value;
            if (!size) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(size).run();
          }}
          className="h-8 rounded-lg border border-gray-100 bg-gray-50 px-2 text-xs font-bold text-gray-700"
        >
          <option value="">Tam.</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size.replace('px', '')}
            </option>
          ))}
        </select>

        <Divider />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          label="Negrito"
        >
          <Bold size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          label="Itálico"
        >
          <Italic size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          label="Sublinhado"
        >
          <UnderlineIcon size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          label="Riscado"
        >
          <Strikethrough size={16} />
        </ToolButton>

        <label
          className="inline-flex items-center gap-1 h-8 px-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
          title="Cor do texto"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Cor
          </span>
          <input
            type="color"
            aria-label="Cor do texto"
            value={(editor.getAttributes('textStyle').color as string) ?? '#111827'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-6 h-6 rounded border border-gray-200 bg-transparent p-0"
          />
        </label>

        <Divider />

        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          label="Alinhar à esquerda"
        >
          <AlignLeft size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          label="Centralizar"
        >
          <AlignCenter size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          label="Alinhar à direita"
        >
          <AlignRight size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          label="Justificar"
        >
          <AlignJustify size={16} />
        </ToolButton>

        <select
          aria-label="Espaçamento entre linhas"
          value={(editor.getAttributes('paragraph').lineHeight as string) ?? ''}
          onChange={(e) => {
            const height = e.target.value;
            if (!height) editor.chain().focus().unsetLineHeight().run();
            else editor.chain().focus().setLineHeight(height).run();
          }}
          className="h-8 rounded-lg border border-gray-100 bg-gray-50 px-2 text-xs font-bold text-gray-700"
        >
          <option value="">Espaçamento</option>
          {LINE_HEIGHTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <Divider />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          label="Lista com marcadores"
        >
          <List size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          label="Lista numerada"
        >
          <ListOrdered size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          label="Citação"
        >
          <Quote size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="Linha divisória"
        >
          <Minus size={16} />
        </ToolButton>

        <Divider />

        <ToolButton onClick={insertLink} active={editor.isActive('link')} label="Inserir link">
          <Link2 size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          label="Remover link"
        >
          <Link2Off size={16} />
        </ToolButton>
        <ToolButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          label="Inserir imagem"
        >
          <ImageIcon size={16} />
        </ToolButton>
        <ToolButton
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
          label="Limpar formatação"
        >
          <Eraser size={16} />
        </ToolButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void insertImageFile(file);
          }}
        />
      </div>

      {uploading ? (
        <p className="px-4 py-2 text-xs font-bold text-gray-400">
          Enviando imagem...
        </p>
      ) : null}
      {uploadError ? (
        <p className="px-4 py-2 text-xs font-bold text-red-500">{uploadError}</p>
      ) : null}

      <div className="p-4 sm:p-8 bg-gray-50/60">
        <div className="mx-auto max-w-3xl bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-10">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  onClick,
  children,
  label,
  active,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors',
        active
          ? 'bg-brand text-white'
          : 'text-gray-500 hover:text-brand hover:bg-brand-muted',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-6 bg-gray-100 mx-1" aria-hidden="true" />;
}

export type { Editor };
