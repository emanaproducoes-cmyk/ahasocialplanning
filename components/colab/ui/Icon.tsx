'use client';

/**
 * Componente Icon — usa a webfont Coolicons v4.1
 *
 * Uso:
 *   <Icon name="Calendar" size={18} color="#4F46E5" />
 *   <Icon name="Trash_Full" size={16} />
 *   <Icon name="User_Circle" size={20} style={{ marginRight: 6 }} />
 *
 * Nomes disponíveis: exatamente o nome da classe CSS sem o prefixo "ci-"
 * Exemplos: Calendar, Trash_Full, Edit, Close_MD, Check, Send, Star,
 *           User_Circle, Log_Out, Bell, Settings, Search, Filter,
 *           Chat, Mail, Arrow_Right_MD, Chevron_Right, Plus, etc.
 */

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}

export default function Icon({ name, size = 16, color, style, className, title }: IconProps) {
  return (
    <i
      className={`ci-${name}${className ? ` ${className}` : ''}`}
      title={title}
      aria-hidden="true"
      style={{
        fontSize: size,
        color: color ?? 'currentColor',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
