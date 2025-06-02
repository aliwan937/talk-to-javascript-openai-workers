import React from 'react';
import { Icon } from 'react-feather';

interface ButtonProps {
  label: string;
  icon?: Icon;
  iconPosition?: 'start' | 'end';
  buttonStyle?: 'regular' | 'action' | 'flush';
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  icon: Icon,
  iconPosition = 'start',
  buttonStyle = 'regular',
  onClick,
}) => {
  return (
    <button
      className={`button ${buttonStyle}`}
      onClick={onClick}
    >
      {Icon && iconPosition === 'start' && <Icon size={16} />}
      <span>{label}</span>
      {Icon && iconPosition === 'end' && <Icon size={16} />}
    </button>
  );
}; 