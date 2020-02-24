import { DOCS_MODE } from 'global';
import React, { ComponentProps, FunctionComponent } from 'react';
import { opacify, transparentize } from 'polished';
import { styled } from '@storybook/theming';
import { Icons } from '@storybook/components';

export type ExpanderProps = ComponentProps<'span'> & {
  isExpanded?: boolean;
  isExpandable?: boolean;
};

const Expander = styled.span<ExpanderProps>(
  ({ theme }) => ({
    display: 'block',
    width: 0,
    height: 0,
    marginRight: 6,
    borderTop: '3.5px solid transparent',
    borderBottom: '3.5px solid transparent',
    borderLeft: `3.5px solid ${opacify(0.2, theme.appBorderColor)}`,
    transition: 'transform .1s ease-out',
  }),

  ({ isExpandable = false }) => (!isExpandable ? { borderLeftColor: 'transparent' } : {}),

  ({ isExpanded = false }) => {
    return isExpanded
      ? {
          transform: 'rotateZ(90deg)',
        }
      : {};
  }
);

export type IconProps = ComponentProps<typeof Icons> & {
  className: string; // FIXME: Icons should extended its typing from the native <svg>
  isSelected?: boolean;
};

const Icon = styled(Icons)<IconProps>(
  {
    flex: 'none',
    width: 10,
    height: 10,
    marginRight: 6,
  },
  ({ icon }) => {
    if (icon === 'folder') {
      return { color: '#774dd7' };
    }
    if (icon === 'component') {
      return { color: '#1ea7fd' };
    }
    if (icon === 'bookmarkhollow' || (DOCS_MODE && icon === 'document')) {
      return { color: '#37d5d3' };
    }
    if (icon === 'document') {
      return { color: '#ffae00' };
    }

    return {};
  },
  ({ isSelected = false }) => (isSelected ? { color: 'inherit' } : {})
);

export const Item = styled.div<{
  depth?: number;
  isSelected?: boolean;
  isLoading?: boolean;
}>(
  {
    fontSize: 13,
    lineHeight: '16px',
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 20,
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    background: 'transparent',
  },
  ({ depth }) => ({
    paddingLeft: depth * 15 + 9,
  }),
  ({ theme, isSelected, isLoading }) =>
    !isLoading &&
    (isSelected
      ? {
          cursor: 'default',
          background: theme.color.secondary,
          color: theme.color.lightest,
          fontWeight: theme.typography.weight.bold,
        }
      : {
          cursor: 'pointer',
          color:
            theme.base === 'light'
              ? theme.color.defaultText
              : transparentize(0.2, theme.color.defaultText),
          '&:hover': {
            color: theme.color.defaultText,
            background: theme.background.hoverable,
          },
        }),
  ({ theme, isLoading }) =>
    isLoading && {
      '&& > svg + span': { background: theme.appBorderColor },
      '&& > *': theme.animation.inlineGlow,
      '&& > span': { borderColor: 'transparent' },
    }
);

type SidebarItemProps = ComponentProps<typeof Item> & {
  childIds?: string[] | null;
  id?: string;
  isComponent?: boolean;
  isExpanded?: boolean;
  isLeaf?: boolean;
  isSelected?: boolean;
  name?: string;
  onClick?: Function;
  onKeyUp?: Function;
  parameters?: Record<string, any>;
  prefix?: string;
};

const SidebarItem: FunctionComponent<SidebarItemProps> = ({
  name = 'isLoading story',
  isComponent = false,
  isLeaf = false,
  isExpanded = false,
  isSelected = false,
  ...props
}) => {
  let iconName: ComponentProps<typeof Icons>['icon'];
  if (isLeaf && isComponent) {
    iconName = 'document';
  } else if (isLeaf) {
    iconName = 'bookmarkhollow';
  } else if (isComponent) {
    iconName = 'component';
  } else {
    iconName = 'folder';
  }

  return (
    <Item
      isSelected={isSelected}
      {...props}
      className={isSelected ? 'sidebar-item selected' : 'sidebar-item'}
    >
      <Expander className="sidebar-expander" isExpandable={!isLeaf} isExpanded={isExpanded} />
      <Icon className="sidebar-svg-icon" icon={iconName} isSelected={isSelected} />
      <span>{name}</span>
    </Item>
  );
};

export default SidebarItem;
