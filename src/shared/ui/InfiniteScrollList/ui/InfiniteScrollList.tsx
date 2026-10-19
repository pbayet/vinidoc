import {
  ReactNode,
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  List,
  type RowComponentProps,
  useDynamicRowHeight,
  useListRef,
} from "react-window";

interface VirtualListProps<T> {
  items: readonly T[];
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  getRowHeight?: (item: T, index: number) => number;
  defaultRowHeight?: number;
  overscanCount?: number;
  gridNumber?: number;
  rowGap?: number;
  columnGap?: number;
  scrollbarPaddingRight?: number;
  onReady?: () => void;
}

interface RowExtraProps<T> {
  items: readonly T[];
  rowGap: number;
  columnGap: number;
  gridNumber: number;
  scrollbarPaddingRight: number;
  enablePadding: boolean;
}

export const VirtualList = <T,>({
  items,
  className,
  renderItem,
  getRowHeight,
  defaultRowHeight = 80,
  overscanCount = 20,
  gridNumber = 1,
  rowGap = 8,
  columnGap = 8,
  scrollbarPaddingRight = 8,
  onReady,
}: VirtualListProps<T>) => {
  const safeGridNumber = gridNumber > 1 ? gridNumber : 1;

  const [enablePadding, setEnablePadding] = useState(false);

  const listRef = useListRef(null);

  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight,
  });

  type RowHeightFn = (index: number, rowProps: RowExtraProps<T>) => number;

  const rowHeight: RowHeightFn | ReturnType<typeof useDynamicRowHeight> =
    getRowHeight != null
      ? (rowIndex, rowProps) => {
          const firstItemIndex = rowIndex * rowProps.gridNumber;
          const firstItem = rowProps.items[firstItemIndex];

          if (firstItem == null) {
            return defaultRowHeight + rowProps.rowGap;
          }

          return getRowHeight(firstItem, firstItemIndex) + rowProps.rowGap;
        }
      : dynamicRowHeight;

  const rowCount =
    items.length === 0 ? 0 : Math.ceil(items.length / safeGridNumber);

  // --- Padding scrollbar via onResize (optionnel, comme avant) ---
  const handleResize = useCallback(() => {
    const handle = listRef.current;
    const element = handle?.element;
    if (!element) {
      return;
    }

    const scrollable = element.scrollHeight > element.clientHeight;
    setEnablePadding(scrollable);
  }, [listRef]);

  // --- Gestion "onReady" basée sur un scrollHeight stable ---
  const hasCalledReadyRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollHeightRef = useRef<number | null>(null);
  const stableFramesRef = useRef(0);

  useEffect(() => {
    // Reset à chaque nouveau set d’items
    hasCalledReadyRef.current = false;
    stableFramesRef.current = 0;
    lastScrollHeightRef.current = null;

    if (!onReady) {
      return;
    }

    let cancelled = false;
    const requiredStableFrames = 2;

    const loop = () => {
      if (cancelled || hasCalledReadyRef.current) {
        return;
      }

      const handle = listRef.current;
      const element = handle?.element;

      // Tant que l’element n’existe pas, on re-essaie au prochain frame
      if (!element) {
        rafIdRef.current = window.requestAnimationFrame(loop);
        return;
      }

      const currentScrollHeight = element.scrollHeight;

      if (lastScrollHeightRef.current === currentScrollHeight) {
        stableFramesRef.current += 1;
      } else {
        lastScrollHeightRef.current = currentScrollHeight;
        stableFramesRef.current = 0;
      }

      if (stableFramesRef.current >= requiredStableFrames) {
        hasCalledReadyRef.current = true;
        onReady();
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(loop);
    };

    rafIdRef.current = window.requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [items, rowCount, onReady, listRef]);

  function Row({
    index: rowIndex,
    style,
    items: rowItems,
    rowGap: rowGapProp,
    columnGap: columnGapProp,
    gridNumber: gridNumberProp,
    scrollbarPaddingRight: scrollbarPaddingRightProp,
    enablePadding: enablePaddingProp,
  }: RowComponentProps<RowExtraProps<T>>) {
    const startIndex = rowIndex * gridNumberProp;
    const endIndex = Math.min(startIndex + gridNumberProp, rowItems.length);

    const outerStyle: CSSProperties = {
      ...style,
    };

    const innerStyle: CSSProperties = {
      paddingBottom: rowGapProp,
      paddingRight: enablePaddingProp ? scrollbarPaddingRightProp : 0,
      boxSizing: "border-box",
      display: "grid",
      gridTemplateColumns: `repeat(${gridNumberProp}, minmax(0, 1fr))`,
      columnGap: columnGapProp,
      width: "100%",
      height: "100%",
    };

    return (
      <div style={outerStyle}>
        <div style={innerStyle}>
          {rowItems.slice(startIndex, endIndex).map((item, columnIndex) => {
            const itemIndex = startIndex + columnIndex;
            return renderItem(item, itemIndex);
          })}
        </div>
      </div>
    );
  }

  return (
    <List<RowExtraProps<T>>
      listRef={listRef}
      className={className}
      rowComponent={Row}
      rowCount={rowCount}
      rowHeight={rowHeight}
      rowProps={{
        items,
        rowGap,
        columnGap,
        gridNumber: safeGridNumber,
        scrollbarPaddingRight,
        enablePadding,
      }}
      overscanCount={overscanCount}
      onResize={handleResize}
    />
  );
};
