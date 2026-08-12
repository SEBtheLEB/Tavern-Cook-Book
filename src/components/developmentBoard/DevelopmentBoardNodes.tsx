import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { DevelopmentBoardGroup, DevelopmentBoardNode } from "../../types";
import { Icon } from "../Icon";

export interface DevelopmentNodeFlowData extends Record<string, unknown> {
  item: DevelopmentBoardNode;
  displayStatus: string;
  waitingOn: string[];
  ownerLabel: string;
  iconName: string;
  linkedTitle: string;
  readOnly: boolean;
}

export interface DevelopmentGroupFlowData extends Record<string, unknown> {
  group: DevelopmentBoardGroup;
  itemCount: number;
  readOnly: boolean;
}

export type DevelopmentNodeFlowNode = Node<DevelopmentNodeFlowData, "developmentNode">;
export type DevelopmentGroupFlowNode = Node<DevelopmentGroupFlowData, "developmentGroup">;
export type DevelopmentFlowNode = DevelopmentNodeFlowNode | DevelopmentGroupFlowNode;

export const DevelopmentBoardNodeCard = memo(function DevelopmentBoardNodeCard({ data, selected }: NodeProps<DevelopmentNodeFlowNode>) {
  const { item, displayStatus, waitingOn, ownerLabel, iconName, linkedTitle, readOnly } = data;
  const statusClass = displayStatus.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <article className={`development-node-card status-${statusClass} ${selected ? "selected" : ""}`}>
      <NodeResizer
        minWidth={220}
        minHeight={130}
        maxWidth={720}
        maxHeight={520}
        isVisible={selected && !readOnly}
        lineClassName="development-node-resizer-line"
        handleClassName="development-node-resizer-handle"
      />
      <Handle type="target" position={Position.Left} className="development-node-handle" isConnectable={!readOnly} />
      <header>
        <span className="development-node-icon"><Icon name={iconName} className="h-4 w-4" /></span>
        <div>
          <small>{item.type}</small>
          <h3>{item.title}</h3>
        </div>
      </header>
      {item.description && <p>{item.description}</p>}
      <footer>
        <span className={`development-status-badge status-${statusClass}`}>{displayStatus}</span>
        {ownerLabel && <span className="development-owner"><Icon name="UserRound" className="h-3.5 w-3.5" />{ownerLabel}</span>}
      </footer>
      {waitingOn.length > 0 && (
        <div className="development-waiting"><Icon name="LockKeyhole" className="h-3.5 w-3.5" />Waiting on: {waitingOn.join(", ")}</div>
      )}
      {linkedTitle && (
        <div className="development-linked-source"><Icon name="Link2" className="h-3.5 w-3.5" />{linkedTitle}</div>
      )}
      <Handle type="source" position={Position.Right} className="development-node-handle" isConnectable={!readOnly} />
    </article>
  );
}, (previous, next) => (
  previous.selected === next.selected
  && previous.data.item === next.data.item
  && previous.data.displayStatus === next.data.displayStatus
  && previous.data.ownerLabel === next.data.ownerLabel
  && previous.data.iconName === next.data.iconName
  && previous.data.linkedTitle === next.data.linkedTitle
  && previous.data.readOnly === next.data.readOnly
  && previous.data.waitingOn.join("\u0000") === next.data.waitingOn.join("\u0000")
));

export const DevelopmentBoardGroupFrame = memo(function DevelopmentBoardGroupFrame({ data, selected }: NodeProps<DevelopmentGroupFlowNode>) {
  const { group, itemCount, readOnly } = data;
  return (
    <section className={`development-group-frame ${selected ? "selected" : ""} ${group.collapsed ? "collapsed" : ""}`} style={{ "--group-color": group.color } as React.CSSProperties}>
      <NodeResizer
        minWidth={600}
        minHeight={400}
        maxWidth={5000}
        maxHeight={5000}
        isVisible={selected && !readOnly}
        lineClassName="development-group-resizer-line"
        handleClassName="development-group-resizer-handle"
      />
      <header>
        <div>
          <small>Board Frame</small>
          <h2>{group.title}</h2>
          {group.description && <p>{group.description}</p>}
        </div>
        <span>{itemCount} {itemCount === 1 ? "node" : "nodes"}{group.collapsed ? " - collapsed" : ""}</span>
      </header>
    </section>
  );
}, (previous, next) => (
  previous.selected === next.selected
  && previous.data.group === next.data.group
  && previous.data.itemCount === next.data.itemCount
  && previous.data.readOnly === next.data.readOnly
));
