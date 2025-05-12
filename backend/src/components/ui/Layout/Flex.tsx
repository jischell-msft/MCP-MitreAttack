import React, { ReactNode } from 'react';
import styles from './Flex.module.scss';

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type FlexJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
type FlexGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface FlexProps {
    children: ReactNode;
    direction?: FlexDirection;
    align?: FlexAlign;
    justify?: FlexJustify;
    wrap?: FlexWrap;
    gap?: FlexGap;
    grow?: number;
    shrink?: number;
    basis?: string;
    className?: string;
}

export const Flex: React.FC<FlexProps> = ({
    children,
    direction = 'row',
    align,
    justify,
    wrap = 'nowrap',
    gap = 'none',
    grow,
    shrink,
    basis,
    className,
    ...rest
}) => {
    const classNames = [
        styles.flex,
        styles[`direction-${direction}`],
        align ? styles[`align-${align}`] : '',
        justify ? styles[`justify-${justify}`] : '',
        wrap !== 'nowrap' ? styles[`wrap-${wrap}`] : '',
        gap !== 'none' ? styles[`gap-${gap}`] : '',
        className || '',
    ].filter(Boolean).join(' ');

    const style = {
        flexGrow: grow,
        flexShrink: shrink,
        flexBasis: basis,
    };

    return (
        <div className={classNames} style={style} {...rest}>
            {children}
        </div>
    );
};
