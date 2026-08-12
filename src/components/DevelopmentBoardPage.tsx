import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  useReactFlow
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DevelopmentBoardConnection,
  DevelopmentBoardData,
  DevelopmentBoardGroup,
  DevelopmentBoardNode,
  DevelopmentBoardNodeStatus,
  DevelopmentBoardViewport,
  GoogleAccountUser,
  LoreDatabase
} from "../types";
import type { TeamMember } from "../utils/assignments";
import {
  createDevelopmentBoardConnection,
  createDevelopmentBoardGroup,
  createDevelopmentBoardNode,
  developmentBoardDisplayStatus,
  developmentBoardIconName,
  developmentBoardNodeTypes,
  developmentBoardRelationshipTypes,
  developmentBoardStatuses,
  developmentBoardTemplates,
  getDevelopmentBoardDependencyState,
  instantiateDevelopmentBoardTemplate,
  normalizeDevelopmentBoardData
} from "../utils/developmentBoard";
import { Icon } from "./Icon";
import {
  DevelopmentBoardGroupFrame,
  DevelopmentBoardNodeCard,
  type DevelopmentFlowNode,
  type DevelopmentGroupFlowNode,
  type DevelopmentNodeFlowNode
} from "./developmentBoard/DevelopmentBoardNodes";

interface DevelopmentBoardPageProps {
  database: LoreDatabase;
  readOnly: boolean;
  currentUser: GoogleAccountUser | null;
  teamMembers: TeamMember[];
  onDatabaseChange: (database: LoreDatabase) => void;
  onOpenLinkedEntity: (type: string, id: string, category: string) => void;
}

interface BoardFilters {
  search: string;
  owner: string;
  status: string;
  type: string;
  tag: string;
  incompleteOnly: boolean;
}

interface EntityOption {
  key: string;
  type: string;
  id: string;
  category: string;
  title: string;
  subtitle: string;
  summary: string;
}

interface BoardUiState {
  filters: BoardFilters;
  connectionType: string;
  viewport?: DevelopmentBoardViewport;
}

type DevelopmentFlowEdge = Edge<{ relationshipType: string }>;
type CreationMode = "node" | "group" | "template" | null;

const UI_STATE_KEY = "tavern-cook-book:development-board-ui";
const nodeTypes = {
  developmentNode: DevelopmentBoardNodeCard,
  developmentGroup: DevelopmentBoardGroupFrame
};

const emptyFilters: BoardFilters = {
  search: "",
  owner: "",
  status: "",
  type: "",
  tag: "",
  incompleteOnly: false
};

export function DevelopmentBoardPage(props: DevelopmentBoardPageProps) {
  return (
    <ReactFlowProvider>
      <DevelopmentBoardWorkspace {...props} />
    </ReactFlowProvider>
  );
}

function DevelopmentBoardWorkspace({ database, readOnly, currentUser, teamMembers, onDatabaseChange, onOpenLinkedEntity }: DevelopmentBoardPageProps) {
  const reactFlow = useReactFlow<DevelopmentFlowNode, DevelopmentFlowEdge>();
  const initialUi = useMemo(loadBoardUiState, []);
  const [board, setBoard] = useState(() => normalizeDevelopmentBoardData(database.developmentBoard));
  const [filters, setFilters] = useState<BoardFilters>(initialUi.filters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [connectionType, setConnectionType] = useState(initialUi.connectionType || "depends-on");
  const [flowNodes, setFlowNodes] = useState<DevelopmentFlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<DevelopmentFlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState("Custom");
  const [createDescription, setCreateDescription] = useState("");
  const [createOwner, setCreateOwner] = useState("");
  const [createGroupId, setCreateGroupId] = useState("");
  const [createEntityKey, setCreateEntityKey] = useState("");
  const [createColor, setCreateColor] = useState("#8a6338");
  const [selectedTemplateId, setSelectedTemplateId] = useState(developmentBoardTemplates[0]?.id || "");
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [dependencyCandidate, setDependencyCandidate] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);
  const boardRef = useRef(board);
  const databaseRef = useRef(database);
  const pastRef = useRef<DevelopmentBoardData[]>([]);
  const futureRef = useRef<DevelopmentBoardData[]>([]);
  const geometryCommitTimerRef = useRef<number | null>(null);
  const viewportRef = useRef(initialUi.viewport || board.viewport);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const entityOptions = useMemo(() => buildEntityOptions(database), [database.entries, database.bestiary, database.worldBuilding, database.storyReferences, database.roadmap]);
  const selectedNode = board.nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedGroup = board.groups.find((group) => group.id === selectedGroupId) || null;
  const selectedConnection = board.connections.find((connection) => connection.id === selectedEdgeId) || null;
  const selectedCanonical = selectedNode ? resolveCanonicalEntity(database, selectedNode) : null;
  const tags = useMemo(() => [...new Set(board.nodes.flatMap((node) => node.tags))].sort(), [board.nodes]);
  const ownerOptions = useMemo(() => buildOwnerOptions(teamMembers, board.nodes), [teamMembers, board.nodes]);
  const searchMatches = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    if (!query) return [];
    return board.nodes.filter((node) => nodeSearchText(node).includes(query)).slice(0, 8);
  }, [board.nodes, filters.search]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    databaseRef.current = database;
    const incoming = normalizeDevelopmentBoardData(database.developmentBoard);
    if (incoming.updatedAt === boardRef.current.updatedAt) return;
    boardRef.current = incoming;
    setBoard(incoming);
  }, [database]);

  const refreshFlow = useCallback((nextBoard: DevelopmentBoardData) => {
    const visibleNodeIds = new Set(
      nextBoard.nodes
        .filter((node) => matchesFilters(nextBoard, node, filters))
        .map((node) => node.id)
    );
    const nextNodes = buildFlowNodes(
      nextBoard,
      databaseRef.current,
      teamMembers,
      visibleNodeIds,
      selectedNodeId,
      selectedGroupId,
      readOnly
    );
    const nextEdges = buildFlowEdges(nextBoard, visibleNodeIds, selectedEdgeId);
    setFlowNodes(nextNodes);
    setFlowEdges(nextEdges);
  }, [filters, readOnly, selectedEdgeId, selectedGroupId, selectedNodeId, teamMembers]);

  useEffect(() => {
    refreshFlow(board);
  }, [board, refreshFlow]);

  useEffect(() => {
    saveBoardUiState({ filters, connectionType, viewport: viewportRef.current });
  }, [filters, connectionType]);

  useEffect(() => () => {
    if (geometryCommitTimerRef.current) window.clearTimeout(geometryCommitTimerRef.current);
  }, []);

  useEffect(() => {
    const endMiddlePan = () => canvasRef.current?.classList.remove("middle-panning");
    window.addEventListener("mouseup", endMiddlePan);
    window.addEventListener("blur", endMiddlePan);
    return () => {
      window.removeEventListener("mouseup", endMiddlePan);
      window.removeEventListener("blur", endMiddlePan);
    };
  }, []);

  useEffect(() => {
    if (!nodeDetailsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNodeDetailsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [nodeDetailsOpen]);

  useEffect(() => {
    if (nodeDetailsOpen && !selectedNode) setNodeDetailsOpen(false);
  }, [nodeDetailsOpen, selectedNode]);

  const commitBoard = useCallback((nextValue: DevelopmentBoardData, options: { history?: boolean; message?: string } = {}) => {
    const previous = boardRef.current;
    if (nextValue === previous) return;
    const next = normalizeDevelopmentBoardData({ ...nextValue, updatedAt: new Date().toISOString() });
    if (options.history !== false && JSON.stringify(previous) !== JSON.stringify(next)) {
      pastRef.current = [...pastRef.current.slice(-49), cloneBoard(previous)];
      futureRef.current = [];
      setHistoryVersion((value) => value + 1);
    }
    boardRef.current = next;
    setBoard(next);
    onDatabaseChange({ ...databaseRef.current, developmentBoard: next });
    if (options.message) {
      setMessage(options.message);
      window.setTimeout(() => setMessage(""), 2400);
    }
  }, [onDatabaseChange]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous || readOnly) return;
    futureRef.current.push(cloneBoard(boardRef.current));
    boardRef.current = previous;
    setBoard(previous);
    onDatabaseChange({ ...databaseRef.current, developmentBoard: previous });
    setHistoryVersion((value) => value + 1);
  }, [onDatabaseChange, readOnly]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next || readOnly) return;
    pastRef.current.push(cloneBoard(boardRef.current));
    boardRef.current = next;
    setBoard(next);
    onDatabaseChange({ ...databaseRef.current, developmentBoard: next });
    setHistoryVersion((value) => value + 1);
  }, [onDatabaseChange, readOnly]);

  const boardFromFlowGeometry = useCallback((nodes: DevelopmentFlowNode[]) => {
    const current = boardRef.current;
    let changed = false;
    const flowById = new Map(nodes.map((node) => [node.id, node] as const));
    const groups = current.groups.map((group) => {
      const flow = flowById.get(group.id);
      if (!flow) return group;
      const width = flowDimension(flow, "width", group.width);
      const height = flowDimension(flow, "height", group.height);
      if (samePoint(group.position, flow.position) && group.width === width && group.height === height) return group;
      changed = true;
      return {
        ...group,
        position: flow.position,
        width,
        height,
        updatedAt: new Date().toISOString()
      };
    });
    const groupById = new Map(groups.map((group) => [group.id, group] as const));
    const boardNodes = current.nodes.map((node) => {
      const flow = flowById.get(node.id);
      if (!flow) return node;
      const parent = node.groupId ? groupById.get(node.groupId) : null;
      const position = parent
        ? { x: parent.position.x + flow.position.x, y: parent.position.y + flow.position.y }
        : flow.position;
      const width = flowDimension(flow, "width", node.width);
      const height = flowDimension(flow, "height", node.height);
      if (samePoint(node.position, position) && node.width === width && node.height === height) return node;
      changed = true;
      return {
        ...node,
        position,
        width,
        height,
        updatedAt: new Date().toISOString()
      };
    });
    return changed ? { ...current, groups, nodes: boardNodes } : current;
  }, []);

  const scheduleGeometryCommit = useCallback((nodes: DevelopmentFlowNode[]) => {
    if (readOnly) return;
    if (geometryCommitTimerRef.current) window.clearTimeout(geometryCommitTimerRef.current);
    geometryCommitTimerRef.current = window.setTimeout(() => {
      geometryCommitTimerRef.current = null;
      commitBoard(boardFromFlowGeometry(nodes));
    }, 320);
  }, [boardFromFlowGeometry, commitBoard, readOnly]);

  const onNodesChange = useCallback((changes: NodeChange<DevelopmentFlowNode>[]) => {
    setFlowNodes((current) => {
      const next = applyNodeChanges(changes, current);
      if (changes.some((change) => change.type === "position" || change.type === "dimensions")) {
        scheduleGeometryCommit(next);
      }
      return next;
    });
  }, [scheduleGeometryCommit]);

  const onEdgesChange = useCallback((changes: EdgeChange<DevelopmentFlowEdge>[]) => {
    setFlowEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (readOnly || !connection.source || !connection.target || connection.source === connection.target) return;
    if (boardRef.current.connections.some((edge) => edge.sourceNodeId === connection.source && edge.targetNodeId === connection.target && edge.relationshipType === connectionType)) return;
    const boardConnection = createDevelopmentBoardConnection({
      sourceNodeId: connection.source,
      targetNodeId: connection.target,
      relationshipType: connectionType
    });
    const nextBoard = { ...boardRef.current, connections: [...boardRef.current.connections, boardConnection] };
    commitBoard(nextBoard, { message: "Connection added." });
    setFlowEdges((current) => addEdge(toFlowEdge(boardConnection, false), current));
  }, [commitBoard, connectionType, readOnly]);

  const patchNode = useCallback((id: string, patch: Partial<DevelopmentBoardNode>) => {
    const next = {
      ...boardRef.current,
      nodes: boardRef.current.nodes.map((node) => node.id === id ? { ...node, ...patch, updatedAt: new Date().toISOString() } : node)
    };
    commitBoard(next);
  }, [commitBoard]);

  const patchGroup = useCallback((id: string, patch: Partial<DevelopmentBoardGroup>) => {
    const next = {
      ...boardRef.current,
      groups: boardRef.current.groups.map((group) => group.id === id ? { ...group, ...patch, updatedAt: new Date().toISOString() } : group)
    };
    commitBoard(next);
  }, [commitBoard]);

  const patchConnection = useCallback((id: string, patch: Partial<DevelopmentBoardConnection>) => {
    const next = {
      ...boardRef.current,
      connections: boardRef.current.connections.map((connection) => connection.id === id ? { ...connection, ...patch, updatedAt: new Date().toISOString() } : connection)
    };
    commitBoard(next);
  }, [commitBoard]);

  const deleteNodes = useCallback((ids: string[]) => {
    if (readOnly || !ids.length) return;
    const idSet = new Set(ids);
    const next = {
      ...boardRef.current,
      nodes: boardRef.current.nodes.filter((node) => !idSet.has(node.id)),
      connections: boardRef.current.connections.filter((connection) => !idSet.has(connection.sourceNodeId) && !idSet.has(connection.targetNodeId))
    };
    commitBoard(next, { message: ids.length === 1 ? "Node deleted." : `${ids.length} nodes deleted.` });
    setNodeDetailsOpen(false);
    setSelectedNodeId("");
  }, [commitBoard, readOnly]);

  const deleteGroups = useCallback((ids: string[]) => {
    if (readOnly || !ids.length) return;
    const idSet = new Set(ids);
    const next = {
      ...boardRef.current,
      groups: boardRef.current.groups.filter((group) => !idSet.has(group.id)),
      nodes: boardRef.current.nodes.map((node) => idSet.has(node.groupId) ? { ...node, groupId: "" } : node)
    };
    commitBoard(next, { message: "Frame removed. Its nodes remain on the board." });
    setSelectedGroupId("");
  }, [commitBoard, readOnly]);

  const deleteConnections = useCallback((ids: string[]) => {
    if (readOnly || !ids.length) return;
    const idSet = new Set(ids);
    commitBoard({ ...boardRef.current, connections: boardRef.current.connections.filter((connection) => !idSet.has(connection.id)) }, { message: "Connection deleted." });
    setSelectedEdgeId("");
  }, [commitBoard, readOnly]);

  const duplicateSelectedNode = useCallback(() => {
    const source = boardRef.current.nodes.find((node) => node.id === selectedNodeId);
    if (!source || readOnly) return;
    const duplicate = createDevelopmentBoardNode({
      ...source,
      id: undefined,
      title: `${source.title} Copy`,
      position: { x: source.position.x + 60, y: source.position.y + 60 },
      linkedEntityId: source.linkedEntityId,
      createdAt: undefined,
      updatedAt: undefined
    });
    commitBoard({ ...boardRef.current, nodes: [...boardRef.current.nodes, duplicate] }, { message: "Node duplicated." });
    setSelectedNodeId(duplicate.id);
    setSelectedGroupId("");
    setSelectedEdgeId("");
  }, [commitBoard, readOnly, selectedNodeId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelectedNode();
      } else if (modifier && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duplicateSelectedNode, redo, undo]);

  const openCreation = (mode: CreationMode) => {
    setCreationMode(mode);
    setCreateTitle("");
    setCreateType(mode === "group" ? "Group" : "Custom");
    setCreateDescription("");
    setCreateOwner("");
    setCreateGroupId("");
    setCreateEntityKey("");
  };

  const closeCreation = () => setCreationMode(null);

  const boardCenter = () => reactFlow.screenToFlowPosition({ x: window.innerWidth * 0.52, y: window.innerHeight * 0.48 });

  const createItem = () => {
    if (readOnly || !createTitle.trim()) return;
    const origin = boardCenter();
    if (creationMode === "group") {
      const group = createDevelopmentBoardGroup({ title: createTitle, description: createDescription, color: createColor, position: origin });
      commitBoard({ ...boardRef.current, groups: [...boardRef.current.groups, group] }, { message: "Frame added." });
      setSelectedGroupId(group.id);
    } else if (creationMode === "template") {
      const template = developmentBoardTemplates.find((item) => item.id === selectedTemplateId);
      if (!template) return;
      const result = instantiateDevelopmentBoardTemplate(template, origin, createTitle);
      commitBoard({
        ...boardRef.current,
        groups: [...boardRef.current.groups, result.group],
        nodes: [...boardRef.current.nodes, ...result.nodes],
        connections: [...boardRef.current.connections, ...result.connections]
      }, { message: `${template.label} added.` });
      setSelectedGroupId(result.group.id);
    } else {
      const entity = entityOptions.find((option) => option.key === createEntityKey);
      const owner = ownerForInput(createOwner, teamMembers);
      const node = createDevelopmentBoardNode({
        title: createTitle,
        type: createType,
        description: createDescription,
        ownerId: owner.id,
        ownerName: owner.name,
        groupId: createGroupId,
        position: origin,
        linkedEntityType: entity?.type || "",
        linkedEntityId: entity?.id || "",
        linkedEntityCategory: entity?.category || ""
      });
      commitBoard({ ...boardRef.current, nodes: [...boardRef.current.nodes, node] }, { message: "Node added." });
      setSelectedNodeId(node.id);
    }
    closeCreation();
  };

  const jumpToNode = (nodeId: string) => {
    const flowNode = reactFlow.getNode(nodeId);
    if (!flowNode) return;
    reactFlow.fitView({ nodes: [flowNode], padding: 1.4, duration: 500, maxZoom: 1.2 });
    setSelectedNodeId(nodeId);
    setSelectedGroupId("");
    setSelectedEdgeId("");
  };

  const openNodeDetails = (nodeId: string) => {
    if (!boardRef.current.nodes.some((node) => node.id === nodeId)) return;
    setSelectedNodeId(nodeId);
    setSelectedGroupId("");
    setSelectedEdgeId("");
    setNodeDetailsOpen(true);
  };

  const centerSelection = () => {
    const id = selectedNodeId || selectedGroupId;
    const flowNode = id ? reactFlow.getNode(id) : null;
    if (flowNode) reactFlow.fitView({ nodes: [flowNode], padding: 0.8, duration: 450, maxZoom: 1.15 });
  };

  const resetView = () => reactFlow.setViewport({ x: 0, y: 0, zoom: 0.7 }, { duration: 450 });

  const addDependency = () => {
    if (!selectedNode || !dependencyCandidate || dependencyCandidate === selectedNode.id) return;
    const exists = board.connections.some((connection) => connection.sourceNodeId === dependencyCandidate && connection.targetNodeId === selectedNode.id && connection.relationshipType === "depends-on");
    if (exists) return;
    const connection = createDevelopmentBoardConnection({ sourceNodeId: dependencyCandidate, targetNodeId: selectedNode.id, relationshipType: "depends-on" });
    commitBoard({ ...boardRef.current, connections: [...boardRef.current.connections, connection] });
    setDependencyCandidate("");
  };

  const addAttachment = () => {
    if (!selectedNode || !/^https?:\/\//i.test(attachmentUrl.trim())) return;
    patchNode(selectedNode.id, {
      attachments: [...selectedNode.attachments, {
        id: `development-attachment-${Date.now()}`,
        title: attachmentTitle.trim() || "Reference",
        url: attachmentUrl.trim(),
        kind: /\.(png|jpe?g|gif|webp)(\?|$)/i.test(attachmentUrl) ? "image" : "link",
        createdAt: new Date().toISOString()
      }]
    });
    setAttachmentTitle("");
    setAttachmentUrl("");
  };

  const removeDependency = (dependencyId: string) => {
    if (!selectedNode) return;
    commitBoard({
      ...boardRef.current,
      connections: boardRef.current.connections.filter((connection) => !(connection.sourceNodeId === dependencyId && connection.targetNodeId === selectedNode.id && connection.relationshipType === "depends-on"))
    });
  };

  const handleViewportEnd = (_event: MouseEvent | TouchEvent | null, viewport: DevelopmentBoardViewport) => {
    if (sameViewport(viewportRef.current, viewport)) return;
    viewportRef.current = viewport;
    saveBoardUiState({ filters, connectionType, viewport });
  };

  const myOwnerValue = useMemo(() => {
    if (!currentUser) return "";
    const member = teamMembers.find((item) => item.email.toLowerCase() === currentUser.email.toLowerCase());
    return member?.id || `name:${currentUser.name}`;
  }, [currentUser, teamMembers]);

  const dependencyState = selectedNode ? getDevelopmentBoardDependencyState(board, selectedNode.id) : null;
  const selectedRelated = selectedNode ? relatedNodes(board, selectedNode.id) : [];
  const visibleCount = board.nodes.filter((node) => matchesFilters(board, node, filters)).length;
  void historyVersion;

  return (
    <section className={`development-board-page ${isFullscreen ? "board-fullscreen" : ""}`}>
      <header className="development-board-hero">
        <div>
          <p>Pre-Production Map</p>
          <h1 className="font-display">{board.title}</h1>
          <span>{board.description}</span>
        </div>
        <div className="development-board-stats">
          <article><strong>{board.nodes.length}</strong><span>Nodes</span></article>
          <article><strong>{board.connections.length}</strong><span>Connections</span></article>
          <article><strong>{board.nodes.filter((node) => developmentBoardDisplayStatus(board, node) === "READY").length}</strong><span>Ready</span></article>
          <article><strong>{board.nodes.filter((node) => developmentBoardDisplayStatus(board, node) === "BLOCKED").length}</strong><span>Blocked</span></article>
        </div>
      </header>

      <div className="development-board-toolbar">
        {!readOnly && <button type="button" className="primary" onClick={() => openCreation("node")}><Icon name="Plus" />Add Node</button>}
        {!readOnly && <button type="button" onClick={() => openCreation("group")}><Icon name="Frame" />Add Frame</button>}
        {!readOnly && <button type="button" onClick={() => openCreation("template")}><Icon name="Workflow" />Templates</button>}
        <label className="development-board-search">
          <Icon name="Search" className="h-4 w-4" />
          <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Find a node, owner, or tag" />
          {searchMatches.length > 0 && (
            <div className="development-search-results">
              {searchMatches.map((node) => <button key={node.id} type="button" onClick={() => jumpToNode(node.id)}><strong>{node.title}</strong><span>{node.type}</span></button>)}
            </div>
          )}
        </label>
        <button type="button" className={filtersOpen ? "active" : ""} onClick={() => setFiltersOpen((value) => !value)}><Icon name="Tags" />Filters{visibleCount !== board.nodes.length ? ` (${visibleCount})` : ""}</button>
        {myOwnerValue && <button type="button" className={filters.owner === myOwnerValue ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, owner: current.owner === myOwnerValue ? "" : myOwnerValue }))}><Icon name="UserRound" />My Work</button>}
        <label className="development-connection-type">Connect as<input list="development-relationship-types" value={connectionType} onChange={(event) => setConnectionType(event.target.value)} /></label>
        <datalist id="development-relationship-types">{developmentBoardRelationshipTypes.map((type) => <option key={type} value={type} />)}</datalist>
        <span className="development-toolbar-spacer" />
        <button type="button" title="Undo" disabled={readOnly || pastRef.current.length === 0} onClick={undo}><Icon name="Undo2" /></button>
        <button type="button" title="Redo" disabled={readOnly || futureRef.current.length === 0} onClick={redo}><Icon name="Redo2" /></button>
        <button type="button" title="Zoom to fit" onClick={() => reactFlow.fitView({ padding: 0.15, duration: 500 })}><Icon name="Maximize2" /></button>
        <button type="button" title="Center selection" disabled={!selectedNodeId && !selectedGroupId} onClick={centerSelection}><Icon name="Focus" /></button>
        <button type="button" title="Reset view" onClick={resetView}><Icon name="RefreshCw" /></button>
        <button type="button" title={isFullscreen ? "Exit fullscreen" : "Fullscreen board"} onClick={() => setIsFullscreen((value) => !value)}><Icon name={isFullscreen ? "Minimize2" : "Maximize2"} /></button>
      </div>

      {filtersOpen && (
        <div className="development-board-filters">
          <label>Owner<select value={filters.owner} onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))}><option value="">All owners</option>{ownerOptions.map((owner) => <option key={owner.value} value={owner.value}>{owner.label}</option>)}</select></label>
          <label>Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{["NOT STARTED", "BLOCKED", "READY", "IN PROGRESS", "REVIEW", "COMPLETE", "PRODUCTION LOCKED"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label>Type<select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}><option value="">All types</option>{[...new Set(board.nodes.map((node) => node.type))].sort().map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label>Tag<select value={filters.tag} onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}><option value="">All tags</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>
          <label className="development-filter-check"><input type="checkbox" checked={filters.incompleteOnly} onChange={(event) => setFilters((current) => ({ ...current, incompleteOnly: event.target.checked }))} />Incomplete only</label>
          <button type="button" onClick={() => setFilters(emptyFilters)}>Clear Filters</button>
        </div>
      )}

      {message && <div className="development-board-message">{message}</div>}

      <div className="development-board-layout">
        <div
          ref={canvasRef}
          className="development-board-canvas"
          aria-label="Tales Development Board canvas"
          onMouseDownCapture={(event) => {
            if (event.button !== 1) return;
            event.preventDefault();
            canvasRef.current?.classList.add("middle-panning");
          }}
          onAuxClick={(event) => event.preventDefault()}
        >
          <ReactFlow<DevelopmentFlowNode, DevelopmentFlowEdge>
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={(nodes) => {
              const itemIds = nodes.filter((node) => node.type === "developmentNode").map((node) => node.id);
              const groupIds = nodes.filter((node) => node.type === "developmentGroup").map((node) => node.id);
              deleteNodes(itemIds);
              deleteGroups(groupIds);
            }}
            onEdgesDelete={(edges) => deleteConnections(edges.map((edge) => edge.id))}
            onSelectionChange={({ nodes, edges }) => {
              const item = nodes.find((node) => node.type === "developmentNode");
              const group = nodes.find((node) => node.type === "developmentGroup");
              if (!item && !group && !edges.length) return;
              setSelectedNodeId(item?.id || "");
              setSelectedGroupId(group?.id || "");
              setSelectedEdgeId(edges[0]?.id || "");
            }}
            onNodeClick={(_event, node) => {
              if (node.type === "developmentNode") openNodeDetails(node.id);
            }}
            onPaneClick={() => {
              setSelectedNodeId("");
              setSelectedGroupId("");
              setSelectedEdgeId("");
            }}
            onNodeDoubleClick={(_event, node) => node.type === "developmentNode" && openNodeDetails(node.id)}
            defaultViewport={initialUi.viewport || board.viewport}
            onMoveEnd={handleViewportEnd}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable
            multiSelectionKeyCode="Shift"
            deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
            panOnDrag={[1]}
            panOnScroll={false}
            preventScrolling
            zoomOnDoubleClick={false}
            selectionOnDrag={false}
            selectNodesOnDrag={false}
            nodeDragThreshold={4}
            paneClickDistance={4}
            minZoom={0.05}
            maxZoom={2.5}
            snapToGrid
            snapGrid={[20, 20]}
            onlyRenderVisibleElements
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />
            <MiniMap pannable zoomable nodeColor={(node) => node.type === "developmentGroup" ? String((node.data as DevelopmentGroupFlowNode["data"]).group.color) : minimapColor(String((node.data as DevelopmentNodeFlowNode["data"]).displayStatus))} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="development-board-inspector">
          {selectedNode ? (
            <div className="development-inspector-selection">
              <Icon name={developmentBoardIconName(selectedNode.type)} className="h-9 w-9" />
              <p>Selected Box</p>
              <h2 className="font-display">{selectedNode.title}</h2>
              <span className={`development-status-badge status-${developmentBoardDisplayStatus(board, selectedNode).toLowerCase().replace(/[^a-z]+/g, "-")}`}>{developmentBoardDisplayStatus(board, selectedNode)}</span>
              <p>{selectedNode.description || "No description has been added yet."}</p>
              <button type="button" onClick={() => setNodeDetailsOpen(true)}><Icon name="PanelRightOpen" />Open Information</button>
            </div>
          ) : selectedGroup ? (
            <GroupInspector group={selectedGroup} readOnly={readOnly} itemCount={board.nodes.filter((node) => node.groupId === selectedGroup.id).length} onPatch={(patch) => patchGroup(selectedGroup.id, patch)} onDelete={() => deleteGroups([selectedGroup.id])} />
          ) : selectedConnection ? (
            <ConnectionInspector connection={selectedConnection} board={board} readOnly={readOnly} onPatch={(patch) => patchConnection(selectedConnection.id, patch)} onDelete={() => deleteConnections([selectedConnection.id])} />
          ) : (
            <div className="development-inspector-empty">
              <Icon name="Network" className="h-10 w-10" />
              <h2 className="font-display">Board Overview</h2>
              <p>{board.nodes.length} planning nodes across {board.groups.length} development frames.</p>
            </div>
          )}
        </aside>
      </div>

      {nodeDetailsOpen && selectedNode && (
        <div className="development-detail-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setNodeDetailsOpen(false)}>
          <section className="development-detail-dialog" role="dialog" aria-modal="true" aria-label={`${selectedNode.title} information`}>
            <header className="development-detail-dialog-header">
              <div><p>Development Board Box</p><h2 className="font-display">Information & Planning</h2></div>
              <button type="button" onClick={() => setNodeDetailsOpen(false)} title="Close information"><Icon name="X" /></button>
            </header>
            <div className="development-detail-dialog-content">
              <NodeInspector
                node={selectedNode}
                board={board}
                readOnly={readOnly}
                canonical={selectedCanonical}
                entityOptions={entityOptions}
                teamMembers={teamMembers}
                dependencyState={dependencyState}
                related={selectedRelated}
                dependencyCandidate={dependencyCandidate}
                attachmentTitle={attachmentTitle}
                attachmentUrl={attachmentUrl}
                onDependencyCandidateChange={setDependencyCandidate}
                onAttachmentTitleChange={setAttachmentTitle}
                onAttachmentUrlChange={setAttachmentUrl}
                onPatch={(patch) => patchNode(selectedNode.id, patch)}
                onAddDependency={addDependency}
                onRemoveDependency={removeDependency}
                onAddAttachment={addAttachment}
                onOpenLinked={() => selectedNode.linkedEntityId && onOpenLinkedEntity(selectedNode.linkedEntityType, selectedNode.linkedEntityId, selectedNode.linkedEntityCategory)}
                onJump={jumpToNode}
                onDuplicate={duplicateSelectedNode}
                onDelete={() => deleteNodes([selectedNode.id])}
              />
            </div>
          </section>
        </div>
      )}

      {creationMode && (
        <div className="development-create-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeCreation()}>
          <section className="development-create-dialog" role="dialog" aria-modal="true" aria-label={creationMode === "group" ? "Add frame" : creationMode === "template" ? "Add template" : "Add node"}>
            <header><div><p>{creationMode === "template" ? "Reusable Structure" : creationMode === "group" ? "Board Frame" : "Development Node"}</p><h2 className="font-display">{creationMode === "template" ? "Create from template" : creationMode === "group" ? "Add a frame" : "Add a node"}</h2></div><button type="button" onClick={closeCreation} title="Close"><Icon name="X" /></button></header>
            {creationMode === "template" && (
              <div className="development-template-grid">
                {developmentBoardTemplates.map((template) => <button key={template.id} type="button" className={selectedTemplateId === template.id ? "active" : ""} onClick={() => setSelectedTemplateId(template.id)}><Icon name="Workflow" /><strong>{template.label}</strong><span>{template.description}</span></button>)}
              </div>
            )}
            <label>{creationMode === "group" ? "Frame Title" : creationMode === "template" ? "Main Name" : "Title"}<input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder={creationMode === "template" ? "Character or boss name" : "Name this item"} /></label>
            {creationMode === "node" && <label>Type<input list="development-node-types" value={createType} onChange={(event) => setCreateType(event.target.value)} /><datalist id="development-node-types">{developmentBoardNodeTypes.map((type) => <option key={type} value={type} />)}</datalist></label>}
            <label>Description<textarea value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Optional planning context" /></label>
            {creationMode === "node" && <><label>Owner<input list="development-owner-names" value={createOwner} onChange={(event) => setCreateOwner(event.target.value)} placeholder="Unassigned" /><datalist id="development-owner-names">{ownerOptions.map((owner) => <option key={owner.value} value={owner.label} />)}</datalist></label><label>Frame<select value={createGroupId} onChange={(event) => setCreateGroupId(event.target.value)}><option value="">No frame</option>{board.groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label><label>Existing Cookbook Entry<select value={createEntityKey} onChange={(event) => { const key = event.target.value; setCreateEntityKey(key); const entity = entityOptions.find((item) => item.key === key); if (entity) { setCreateTitle(entity.title); setCreateType(typeForEntity(entity)); setCreateDescription(entity.summary); } }}><option value="">No linked entry</option>{entityOptions.map((option) => <option key={option.key} value={option.key}>{option.subtitle}: {option.title}</option>)}</select></label></>}
            {creationMode === "group" && <label>Frame Color<input type="color" value={createColor} onChange={(event) => setCreateColor(event.target.value)} /></label>}
            <footer><button type="button" onClick={closeCreation}>Cancel</button><button type="button" className="primary" disabled={!createTitle.trim()} onClick={createItem}><Icon name="Plus" />Create</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}

interface CanonicalPreview {
  title: string;
  summary: string;
  sections: Array<{ title: string; content: string }>;
}

function NodeInspector(props: {
  node: DevelopmentBoardNode;
  board: DevelopmentBoardData;
  readOnly: boolean;
  canonical: CanonicalPreview | null;
  entityOptions: EntityOption[];
  teamMembers: TeamMember[];
  dependencyState: ReturnType<typeof getDevelopmentBoardDependencyState> | null;
  related: Array<{ node: DevelopmentBoardNode; relationship: string }>;
  dependencyCandidate: string;
  attachmentTitle: string;
  attachmentUrl: string;
  onDependencyCandidateChange: (value: string) => void;
  onAttachmentTitleChange: (value: string) => void;
  onAttachmentUrlChange: (value: string) => void;
  onPatch: (patch: Partial<DevelopmentBoardNode>) => void;
  onAddDependency: () => void;
  onRemoveDependency: (id: string) => void;
  onAddAttachment: () => void;
  onOpenLinked: () => void;
  onJump: (id: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { node, board, readOnly, canonical, entityOptions, teamMembers, dependencyState, related, onPatch } = props;
  const entityKey = node.linkedEntityId ? `${node.linkedEntityType}::${node.linkedEntityCategory}::${node.linkedEntityId}` : "";
  const displayStatus = developmentBoardDisplayStatus(board, node);
  return (
    <div className="development-node-inspector">
      <header><div><p>Node Detail</p><h2 className="font-display">{node.title}</h2><span className={`development-status-badge status-${displayStatus.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{displayStatus}</span></div><Icon name={developmentBoardIconName(node.type)} className="h-8 w-8" /></header>
      {displayStatus === "BLOCKED" && <div className="development-blocked-notice"><Icon name="LockKeyhole" />Waiting on {dependencyState?.waitingOn.map((item) => item.title).join(", ")}.</div>}
      <div className="development-inspector-fields">
        <label>Title<input value={node.title} disabled={readOnly} onChange={(event) => onPatch({ title: event.target.value })} /></label>
        <label>Type<input list="development-inspector-node-types" value={node.type} disabled={readOnly} onChange={(event) => onPatch({ type: event.target.value })} /><datalist id="development-inspector-node-types">{developmentBoardNodeTypes.map((type) => <option key={type} value={type} />)}</datalist></label>
        <label>Status<select value={node.status} disabled={readOnly} onChange={(event) => onPatch({ status: event.target.value as DevelopmentBoardNodeStatus })}>{developmentBoardStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        <label>Owner<input list="development-inspector-owners" value={node.ownerName} disabled={readOnly} onChange={(event) => { const owner = ownerForInput(event.target.value, teamMembers); onPatch({ ownerId: owner.id, ownerName: owner.name }); }} placeholder="Unassigned" /><datalist id="development-inspector-owners">{teamMembers.map((member) => <option key={member.id} value={member.name} />)}</datalist></label>
        <label>Frame<select value={node.groupId} disabled={readOnly} onChange={(event) => onPatch({ groupId: event.target.value })}><option value="">No frame</option>{board.groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
        <label className="wide">Description<textarea value={node.description} disabled={readOnly} onChange={(event) => onPatch({ description: event.target.value })} /></label>
        <label className="wide">Tags<input value={node.tags.join(", ")} disabled={readOnly} onChange={(event) => onPatch({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="region, combat, tutorial" /></label>
        <label className="wide">Local Planning Notes<textarea value={node.notes} disabled={readOnly} onChange={(event) => onPatch({ notes: event.target.value })} placeholder="Board-specific notes that do not rewrite the Cookbook source" /></label>
      </div>

      <section className="development-inspector-section">
        <header><div><p>Canonical Source</p><h3>Linked Cookbook Entry</h3></div>{node.linkedEntityId && <button type="button" onClick={props.onOpenLinked}><Icon name="ExternalLink" />Open Source</button>}</header>
        <select value={entityKey} disabled={readOnly} onChange={(event) => { const entity = entityOptions.find((item) => item.key === event.target.value); onPatch(entity ? { linkedEntityType: entity.type, linkedEntityId: entity.id, linkedEntityCategory: entity.category } : { linkedEntityType: "", linkedEntityId: "", linkedEntityCategory: "" }); }}><option value="">No linked source</option>{entityOptions.map((option) => <option key={option.key} value={option.key}>{option.subtitle}: {option.title}</option>)}</select>
        {canonical ? <div className="development-canonical-preview"><strong>{canonical.title}</strong><p>{canonical.summary || "No summary has been written yet."}</p>{canonical.sections.map((section) => <details key={section.title}><summary>{section.title}</summary><p>{section.content}</p></details>)}</div> : <p className="development-muted">This node currently holds planning information only. Link it to a Cookbook entry when a canonical page exists.</p>}
      </section>

      <section className="development-inspector-section">
        <header><div><p>Readiness</p><h3>Dependencies</h3></div></header>
        {dependencyState?.dependencies.length ? <div className="development-chip-list">{dependencyState.dependencies.map((dependency) => <span key={dependency.id}>{dependency.title}{!readOnly && <button type="button" onClick={() => props.onRemoveDependency(dependency.id)} title="Remove dependency"><Icon name="X" className="h-3 w-3" /></button>}</span>)}</div> : <p className="development-muted">No prerequisites. This work can begin whenever the team is ready.</p>}
        {!readOnly && <div className="development-inline-add"><select value={props.dependencyCandidate} onChange={(event) => props.onDependencyCandidateChange(event.target.value)}><option value="">Choose prerequisite</option>{board.nodes.filter((candidate) => candidate.id !== node.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select><button type="button" disabled={!props.dependencyCandidate} onClick={props.onAddDependency}><Icon name="Link2" />Add</button></div>}
      </section>

      <section className="development-inspector-section">
        <header><div><p>Backlinks</p><h3>Related Work</h3></div></header>
        {related.length ? <div className="development-related-list">{related.map(({ node: relatedNode, relationship }) => <button key={`${relatedNode.id}-${relationship}`} type="button" onClick={() => props.onJump(relatedNode.id)}><span><strong>{relatedNode.title}</strong><small>{relationship}</small></span><Icon name="Focus" className="h-4 w-4" /></button>)}</div> : <p className="development-muted">No connected work yet.</p>}
      </section>

      <section className="development-inspector-section">
        <header><div><p>References</p><h3>Links & Media</h3></div></header>
        {node.attachments.map((attachment) => <div key={attachment.id} className="development-attachment"><a href={attachment.url} target="_blank" rel="noreferrer"><Icon name="ExternalLink" />{attachment.title}</a>{!readOnly && <button type="button" title="Remove attachment" onClick={() => onPatch({ attachments: node.attachments.filter((item) => item.id !== attachment.id) })}><Icon name="Trash2" className="h-4 w-4" /></button>}</div>)}
        {!readOnly && <div className="development-attachment-form"><input value={props.attachmentTitle} onChange={(event) => props.onAttachmentTitleChange(event.target.value)} placeholder="Reference title" /><input value={props.attachmentUrl} onChange={(event) => props.onAttachmentUrlChange(event.target.value)} placeholder="https://..." /><button type="button" onClick={props.onAddAttachment} disabled={!/^https?:\/\//i.test(props.attachmentUrl)}><Icon name="Plus" />Add Link</button></div>}
      </section>

      {!readOnly && <footer className="development-inspector-actions"><button type="button" onClick={props.onDuplicate}><Icon name="Copy" />Duplicate</button><button type="button" className="danger" onClick={props.onDelete}><Icon name="Trash2" />Delete Node</button></footer>}
    </div>
  );
}

function GroupInspector({ group, readOnly, itemCount, onPatch, onDelete }: { group: DevelopmentBoardGroup; readOnly: boolean; itemCount: number; onPatch: (patch: Partial<DevelopmentBoardGroup>) => void; onDelete: () => void }) {
  return <div className="development-node-inspector"><header><div><p>Board Frame</p><h2 className="font-display">{group.title}</h2><span>{itemCount} contained nodes</span></div><Icon name="Frame" className="h-8 w-8" /></header><div className="development-inspector-fields"><label>Title<input value={group.title} disabled={readOnly} onChange={(event) => onPatch({ title: event.target.value })} /></label><label>Color<input type="color" value={group.color} disabled={readOnly} onChange={(event) => onPatch({ color: event.target.value })} /></label><label className="wide">Description<textarea value={group.description} disabled={readOnly} onChange={(event) => onPatch({ description: event.target.value })} /></label><label className="development-filter-check wide"><input type="checkbox" checked={group.collapsed} disabled={readOnly} onChange={(event) => onPatch({ collapsed: event.target.checked })} />Collapse contained nodes</label></div>{!readOnly && <footer className="development-inspector-actions"><button type="button" className="danger" onClick={onDelete}><Icon name="Trash2" />Remove Frame</button></footer>}</div>;
}

function ConnectionInspector({ connection, board, readOnly, onPatch, onDelete }: { connection: DevelopmentBoardConnection; board: DevelopmentBoardData; readOnly: boolean; onPatch: (patch: Partial<DevelopmentBoardConnection>) => void; onDelete: () => void }) {
  const source = board.nodes.find((node) => node.id === connection.sourceNodeId);
  const target = board.nodes.find((node) => node.id === connection.targetNodeId);
  return <div className="development-node-inspector"><header><div><p>Connection</p><h2 className="font-display">{source?.title || "Unknown"} to {target?.title || "Unknown"}</h2></div><Icon name="Link2" className="h-8 w-8" /></header><div className="development-connection-summary"><strong>{source?.title}</strong><Icon name="ChevronRight" /><strong>{target?.title}</strong></div><div className="development-inspector-fields"><label className="wide">Relationship<input list="development-inspector-relationships" value={connection.relationshipType} disabled={readOnly} onChange={(event) => onPatch({ relationshipType: event.target.value })} /><datalist id="development-inspector-relationships">{developmentBoardRelationshipTypes.map((type) => <option key={type} value={type} />)}</datalist></label><label className="wide">Label<input value={connection.label} disabled={readOnly} onChange={(event) => onPatch({ label: event.target.value })} placeholder="Optional line label" /></label></div>{!readOnly && <footer className="development-inspector-actions"><button type="button" className="danger" onClick={onDelete}><Icon name="Trash2" />Delete Connection</button></footer>}</div>;
}

function buildFlowNodes(board: DevelopmentBoardData, database: LoreDatabase, teamMembers: TeamMember[], visibleNodeIds: Set<string>, selectedNodeId: string, selectedGroupId: string, readOnly: boolean): DevelopmentFlowNode[] {
  const groups = board.groups.map<DevelopmentGroupFlowNode>((group) => {
    const children = board.nodes.filter((node) => node.groupId === group.id);
    const hidden = hasActiveVisibilityFilter(board, visibleNodeIds) && !children.some((node) => visibleNodeIds.has(node.id));
    return {
      id: group.id,
      type: "developmentGroup",
      position: group.position,
      data: { group, itemCount: children.length, readOnly },
      style: { width: group.width, height: group.height },
      selected: group.id === selectedGroupId,
      draggable: !readOnly,
      selectable: true,
      deletable: !readOnly,
      hidden,
      zIndex: -10
    };
  });
  const groupById = new Map(board.groups.map((group) => [group.id, group] as const));
  const nodes = board.nodes.map<DevelopmentNodeFlowNode>((item) => {
    const group = item.groupId ? groupById.get(item.groupId) : null;
    const dependency = getDevelopmentBoardDependencyState(board, item.id);
    const canonical = resolveCanonicalEntity(database, item);
    const owner = teamMembers.find((member) => member.id === item.ownerId);
    return {
      id: item.id,
      type: "developmentNode",
      position: group ? { x: item.position.x - group.position.x, y: item.position.y - group.position.y } : item.position,
      parentId: group?.id,
      data: {
        item,
        displayStatus: developmentBoardDisplayStatus(board, item),
        waitingOn: dependency.waitingOn.map((node) => node.title),
        ownerLabel: owner?.name || item.ownerName,
        iconName: developmentBoardIconName(item.type),
        linkedTitle: canonical?.title || "",
        readOnly
      },
      style: { width: item.width, height: item.height },
      selected: item.id === selectedNodeId,
      draggable: !readOnly,
      connectable: !readOnly,
      selectable: true,
      deletable: !readOnly,
      hidden: group?.collapsed || !visibleNodeIds.has(item.id),
      expandParent: false,
      zIndex: 10
    };
  });
  return [...groups, ...nodes];
}

function buildFlowEdges(board: DevelopmentBoardData, visibleNodeIds: Set<string>, selectedEdgeId: string) {
  const groupById = new Map(board.groups.map((group) => [group.id, group] as const));
  const nodeById = new Map(board.nodes.map((node) => [node.id, node] as const));
  return board.connections.map((connection) => {
    const source = nodeById.get(connection.sourceNodeId);
    const target = nodeById.get(connection.targetNodeId);
    const hidden = !visibleNodeIds.has(connection.sourceNodeId) || !visibleNodeIds.has(connection.targetNodeId) || Boolean(source?.groupId && groupById.get(source.groupId)?.collapsed) || Boolean(target?.groupId && groupById.get(target.groupId)?.collapsed);
    return { ...toFlowEdge(connection, connection.id === selectedEdgeId), hidden };
  });
}

function toFlowEdge(connection: DevelopmentBoardConnection, selected: boolean): DevelopmentFlowEdge {
  const color = relationshipColor(connection.relationshipType);
  return {
    id: connection.id,
    source: connection.sourceNodeId,
    target: connection.targetNodeId,
    data: { relationshipType: connection.relationshipType },
    label: connection.label || relationshipLabel(connection.relationshipType),
    type: "smoothstep",
    selected,
    animated: false,
    style: {
      stroke: color,
      strokeWidth: selected ? 3 : 2,
      strokeDasharray: connection.relationshipType === "depends-on" ? "8 6" : undefined
    },
    labelStyle: { fill: "var(--app-ink)", fontWeight: 800, fontSize: 11 },
    labelBgStyle: { fill: "var(--card-bg)", fillOpacity: 0.94 },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color }
  };
}

function buildEntityOptions(database: LoreDatabase): EntityOption[] {
  const options: EntityOption[] = [];
  database.entries.forEach((entry) => options.push({ key: `entry::${entry.category}::${entry.id}`, type: "entry", id: entry.id, category: entry.category, title: entry.title, subtitle: entry.category || "Cookbook", summary: entry.summary || entry.publicDescription || "" }));
  database.bestiary.forEach((creature) => options.push({ key: `creature::${creature.category}::${creature.id}`, type: "creature", id: creature.id, category: creature.category, title: creature.name, subtitle: "Bestiary", summary: creature.description || creature.overview || "" }));
  Object.values(database.worldBuilding || {}).flat().forEach((entry) => options.push({ key: `world::${entry.category}::${entry.id}`, type: "world", id: entry.id, category: entry.category, title: entry.title, subtitle: "World Building", summary: entry.summary || "" }));
  database.storyReferences.forEach((entry) => options.push({ key: `story-reference::story::${entry.id}`, type: "story-reference", id: entry.id, category: "story", title: entry.title, subtitle: "Story Source", summary: entry.shortSummary || "" }));
  database.roadmap?.items.forEach((item) => options.push({ key: `roadmap-item::roadmap::${item.id}`, type: "roadmap-item", id: item.id, category: "roadmap", title: item.title, subtitle: "Roadmap", summary: item.summary || "" }));
  return options.sort((left, right) => left.subtitle.localeCompare(right.subtitle) || left.title.localeCompare(right.title));
}

function resolveCanonicalEntity(database: LoreDatabase, node: DevelopmentBoardNode): CanonicalPreview | null {
  if (!node.linkedEntityId) return null;
  if (node.linkedEntityType === "entry") {
    const entry = database.entries.find((candidate) => candidate.id === node.linkedEntityId);
    if (!entry) return null;
    return { title: entry.title, summary: entry.summary || entry.publicDescription || "", sections: [{ title: "Internal Lore", content: entry.internalLore || "No internal lore yet." }, { title: "Production Notes", content: entry.notes?.production || "No production notes yet." }] };
  }
  if (node.linkedEntityType === "creature") {
    const creature = database.bestiary.find((candidate) => candidate.id === node.linkedEntityId);
    if (!creature) return null;
    return { title: creature.name, summary: creature.description || creature.overview || "", sections: [{ title: "Gameplay", content: creature.gameplayPurpose || creature.behavior || "No gameplay notes yet." }, { title: "Visual", content: creature.visualDesignNotes || "No visual notes yet." }, { title: "Production", content: creature.productionNotes || "No production notes yet." }] };
  }
  if (node.linkedEntityType === "world") {
    const entry = Object.values(database.worldBuilding || {}).flat().find((candidate) => candidate.id === node.linkedEntityId);
    if (!entry) return null;
    return { title: entry.title, summary: entry.summary || "", sections: Object.entries(entry.fields || {}).slice(0, 5).map(([title, content]) => ({ title, content: String(content || "") })) };
  }
  if (node.linkedEntityType === "story-reference") {
    const entry = database.storyReferences.find((candidate) => candidate.id === node.linkedEntityId);
    if (!entry) return null;
    return { title: entry.title, summary: entry.shortSummary || "", sections: [{ title: "Full Story Source", content: entry.fullDescription || "No full description yet." }, { title: "Notes", content: entry.notes || "No notes yet." }] };
  }
  if (node.linkedEntityType === "roadmap-item") {
    const item = database.roadmap?.items.find((candidate) => candidate.id === node.linkedEntityId);
    if (!item) return null;
    return { title: item.title, summary: item.summary || "", sections: [{ title: "Roadmap Notes", content: item.notes || "No notes yet." }] };
  }
  return null;
}

function relatedNodes(board: DevelopmentBoardData, nodeId: string) {
  return board.connections.flatMap((connection) => {
    if (connection.sourceNodeId === nodeId) {
      const node = board.nodes.find((candidate) => candidate.id === connection.targetNodeId);
      return node ? [{ node, relationship: `${relationshipLabel(connection.relationshipType)} ->` }] : [];
    }
    if (connection.targetNodeId === nodeId) {
      const node = board.nodes.find((candidate) => candidate.id === connection.sourceNodeId);
      return node ? [{ node, relationship: `<- ${relationshipLabel(connection.relationshipType)}` }] : [];
    }
    return [];
  });
}

function matchesFilters(board: DevelopmentBoardData, node: DevelopmentBoardNode, filters: BoardFilters) {
  if (filters.search && !nodeSearchText(node).includes(filters.search.toLowerCase())) return false;
  if (filters.owner) {
    const matches = filters.owner.startsWith("name:") ? node.ownerName.toLowerCase() === filters.owner.slice(5).toLowerCase() : node.ownerId === filters.owner;
    if (!matches) return false;
  }
  if (filters.status && developmentBoardDisplayStatus(board, node) !== filters.status) return false;
  if (filters.type && node.type !== filters.type) return false;
  if (filters.tag && !node.tags.includes(filters.tag)) return false;
  if (filters.incompleteOnly && node.status === "complete") return false;
  return true;
}

function hasActiveVisibilityFilter(board: DevelopmentBoardData, visibleNodeIds: Set<string>) {
  return visibleNodeIds.size !== board.nodes.length;
}

function nodeSearchText(node: DevelopmentBoardNode) {
  return [node.title, node.type, node.description, node.ownerName, node.status, node.notes, ...node.tags].join(" ").toLowerCase();
}

function buildOwnerOptions(teamMembers: TeamMember[], nodes: DevelopmentBoardNode[]) {
  const options = teamMembers.map((member) => ({ value: member.id, label: member.name }));
  nodes.filter((node) => node.ownerName && !teamMembers.some((member) => member.id === node.ownerId || member.name.toLowerCase() === node.ownerName.toLowerCase())).forEach((node) => options.push({ value: `name:${node.ownerName}`, label: node.ownerName }));
  return [...new Map(options.map((option) => [option.value, option])).values()].sort((left, right) => left.label.localeCompare(right.label));
}

function ownerForInput(value: string, teamMembers: TeamMember[]) {
  const name = value.trim();
  const member = teamMembers.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase() || candidate.id === value);
  return member ? { id: member.id, name: member.name } : { id: "", name };
}

function typeForEntity(entity: EntityOption) {
  if (entity.type === "creature") return entity.category.toLowerCase().includes("boss") ? "Boss" : "Custom";
  if (entity.type === "story-reference") return "Story";
  if (entity.type === "world") return entity.category === "locations" ? "Location" : "Lore";
  if (entity.type === "roadmap-item") return "Production";
  if (/character|npc|villain|hero/i.test(entity.category)) return "Character";
  if (/quest/i.test(entity.category)) return "Quest";
  if (/recipe|meal|food/i.test(entity.category)) return "Dish";
  if (/location|world/i.test(entity.category)) return "Location";
  return "Custom";
}

function relationshipLabel(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function relationshipColor(value: string) {
  if (value === "depends-on") return "#b0612d";
  if (value === "blocks") return "#a43e45";
  if (value === "part-of" || value === "contains") return "#53745a";
  if (value.includes("story")) return "#76558e";
  if (value.includes("location")) return "#447684";
  if (value.includes("character")) return "#8c5c48";
  return "#7b6a55";
}

function minimapColor(status: string) {
  if (status === "COMPLETE") return "#4f7759";
  if (status === "BLOCKED") return "#a34245";
  if (status === "READY") return "#2f776e";
  if (status === "IN PROGRESS") return "#b16b2d";
  if (status === "REVIEW") return "#79568d";
  if (status === "PRODUCTION LOCKED") return "#4b4550";
  return "#90775c";
}

function statusLabel(status: DevelopmentBoardNodeStatus) {
  return status.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function flowDimension(node: DevelopmentFlowNode, key: "width" | "height", fallback: number) {
  const measured = node.measured?.[key];
  const styled = Number(node.style?.[key]);
  return Number.isFinite(measured) && measured ? measured : Number.isFinite(styled) && styled ? styled : fallback;
}

function cloneBoard(board: DevelopmentBoardData) {
  return JSON.parse(JSON.stringify(board)) as DevelopmentBoardData;
}

function loadBoardUiState(): BoardUiState {
  try {
    const parsed = JSON.parse(localStorage.getItem(UI_STATE_KEY) || "{}") as { filters?: Partial<BoardFilters>; connectionType?: string; viewport?: Partial<DevelopmentBoardViewport> };
    const viewport = parsed.viewport
      && Number.isFinite(parsed.viewport.x)
      && Number.isFinite(parsed.viewport.y)
      && Number.isFinite(parsed.viewport.zoom)
      ? parsed.viewport as DevelopmentBoardViewport
      : undefined;
    return { filters: { ...emptyFilters, ...(parsed.filters || {}) }, connectionType: parsed.connectionType || "depends-on", viewport };
  } catch {
    return { filters: emptyFilters, connectionType: "depends-on" };
  }
}

function saveBoardUiState(value: BoardUiState) {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(value));
  } catch {
    // Board content still persists in the shared Cookbook database.
  }
}

function samePoint(left: { x: number; y: number }, right: { x: number; y: number }) {
  return left.x === right.x && left.y === right.y;
}

function sameViewport(left: DevelopmentBoardViewport, right: DevelopmentBoardViewport) {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}
