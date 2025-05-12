import React, { ReactNode } from 'react';
import styles from './Grid.module.scss';

type GridAlign = 'start' | 'center' | 'end' | 'stretch';
type GridJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
type GridSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type GridDirection = 'row' | 'column';

export interface GridProps {
    children: ReactNode;
    container?: boolean;
    item?: boolean;
    xs?: number | 'auto'; // 1-12, auto
    sm?: number | 'auto';
    md?: number | 'auto';
    lg?: number | 'auto';
    xl?: number | 'auto';
    spacing?: GridSpacing;
    align?: GridAlign;
    justify?: GridJustify;
    direction?: GridDirection;
    wrap?: boolean;
    className?: string;
}

export const Grid: React.FC<GridProps> = ({
    children,
    container = false,
    item = false,
    xs,
    sm,
    md,
    lg,
    xl,
    spacing = 'md',
    align,
    justify,
    direction = 'row',
    wrap = true,
    className,
    ...rest
}) => {
    const classNames = [
        container ? styles.container : '',
        item ? styles.item : '',
        spacing !== 'none' && container ? styles[`spacing-${spacing}`] : '',
        align && container ? styles[`align-${align}`] : '',
        justify && container ? styles[`justify-${justify}`] : '',
        direction !== 'row' && container ? styles[`direction-${direction}`] : '',
        !wrap && container ? styles.nowrap : '',
        xs !== undefined ? styles[`xs-${xs}`] : '',
        sm !== undefined ? styles[`sm-${sm}`] : '',
        md !== undefined ? styles[`md-${md}`] : '',
        lg !== undefined ? styles[`lg-${lg}`] : '',
        xl !== undefined ? styles[`xl-${xl}`] : '',
        className || '',
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames} {...rest}>
            {children}
        </div>
    );
};
