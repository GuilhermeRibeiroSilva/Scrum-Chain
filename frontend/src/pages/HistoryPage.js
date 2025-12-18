import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  Avatar,
  ListItemIcon,
  Fade
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  DeleteSweep as ClearIcon,
  Delete as DeleteIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as ConfirmedIcon,
  Schedule as PendingIcon,
  Error as FailedIcon,
  OpenInNew as ExternalLinkIcon,
  ContentCopy as CopyIcon,
  TrendingUp as StatsIcon,
  Groups as TeamIcon,
  Assignment as BacklogIcon,
  DirectionsRun as SprintIcon,
  Task as TaskIcon,
  Add as AddIcon,
  Edit as EditIcon,
  PersonAdd as AddMemberIcon,
  PersonRemove as RemoveMemberIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Person as AssignIcon,
  Info as InfoIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BlockchainService from '../services/BlockchainService';

const BlockchainHistoryPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);


  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalTransactions, setTotalTransactions] = useState(0);


  const [filters, setFilters] = useState({
    category: '',
    transactionType: '',
    status: ''
  });


  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);


  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);


  const transactionCategories = {
    team: {
      label: 'Equipes/Grupos',
      icon: <TeamIcon />,
      color: 'primary',
      backgroundColor: '#e3f2fd',
      types: {
        team_create: {
          label: 'Criação de Equipe',
          icon: <AddIcon />,
          description: 'Nova equipe foi criada no sistema',
          color: 'success'
        },
        team_edit: {
          label: 'Edição de Equipe',
          icon: <EditIcon />,
          description: 'Dados da equipe foram alterados',
          color: 'warning'
        },
        team_member_add: {
          label: 'Membro Adicionado',
          icon: <AddMemberIcon />,
          description: 'Novo membro foi adicionado à equipe',
          color: 'success'
        },
        team_delete: {
          label: 'Exclusão de Equipe',
          icon: <DeleteIcon />,
          description: 'Equipe foi removida do sistema',
          color: 'error'
        }
      }
    },
    backlog: {
      label: 'Backlog',
      icon: <BacklogIcon />,
      color: 'info',
      backgroundColor: '#e8f5e8',
      types: {
        backlog_create: {
          label: 'Backlog Criado',
          icon: <AddIcon />,
          description: 'Novo backlog foi adicionado ao sistema',
          color: 'success'
        },
        backlog_edit: {
          label: 'Backlog Editado',
          icon: <EditIcon />,
          description: 'Backlog foi modificado',
          color: 'warning'
        },
        backlog_status_update: {
          label: 'Status Alterado',
          icon: <InfoIcon />,
          description: 'Status do backlog foi atualizado',
          color: 'info'
        },
        backlog_delete: {
          label: 'Backlog Excluído',
          icon: <DeleteIcon />,
          description: 'Backlog foi removido do sistema',
          color: 'error'
        }
      }
    },
    sprint: {
      label: 'Sprints',
      icon: <SprintIcon />,
      color: 'success',
      backgroundColor: '#fff3e0',
      types: {
        sprint_create: {
          label: 'Sprint Criada',
          icon: <AddIcon />,
          description: 'Nova sprint foi criada',
          color: 'success'
        },
        sprint_edit: {
          label: 'Sprint Editada',
          icon: <EditIcon />,
          description: 'Dados da sprint foram alterados',
          color: 'warning'
        },
        sprint_status_update: {
          label: 'Status da Sprint',
          icon: <InfoIcon />,
          description: 'Status da sprint foi modificado',
          color: 'info'
        },
        sprint_delete: {
          label: 'Sprint Excluída',
          icon: <DeleteIcon />,
          description: 'Sprint foi removida do sistema',
          color: 'error'
        }
      }
    },
    task: {
      label: 'Tarefas',
      icon: <TaskIcon />,
      color: 'warning',
      backgroundColor: '#fce4ec',
      types: {
        task_create: {
          label: 'Tarefa Criada',
          icon: <AddIcon />,
          description: 'Nova tarefa foi criada',
          color: 'success'
        },
        task_edit: {
          label: 'Tarefa Editada',
          icon: <EditIcon />,
          description: 'Dados da tarefa foram alterados',
          color: 'warning'
        },
        task_status_update: {
          label: 'Status da Tarefa',
          icon: <InfoIcon />,
          description: 'Status da tarefa foi atualizado',
          color: 'info'
        },
        task_delete: {
          label: 'Tarefa Excluída',
          icon: <DeleteIcon />,
          description: 'Tarefa foi removida do sistema',
          color: 'error'
        }
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, rowsPerPage, filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Carregando estatísticas das transações...');
      const statsResponse = await BlockchainService.getStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
        console.log('✅ Estatísticas carregadas:', statsResponse.data);
      }

    } catch (err) {
      console.error('❌ Erro ao carregar dados iniciais:', err);
      setError('Erro ao carregar dados das transações blockchain');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setRefreshing(true);
      setError(null);


      const backendFilters = {
        page: page + 1,
        limit: rowsPerPage
      };


      if (filters.transactionType) {
        backendFilters.transactionType = filters.transactionType;
      }


      if (filters.status) {
        backendFilters.status = filters.status;
      }

      console.log('⛓️ Carregando transações blockchain com filtros:', backendFilters);

      const response = await BlockchainService.getUserTransactions(backendFilters);

      console.log('✅ Transações carregadas:', response);

      if (response.success) {
        let filteredTransactions = response.data || [];


        const uniqueTypes = [...new Set(filteredTransactions.map(t => t.transaction_type))];
        console.log('🔍 Tipos únicos de transação do backend:', uniqueTypes);


        uniqueTypes.forEach(type => {
          const info = getTransactionInfo(type);
          console.log(`📋 ${type} → Categoria: ${info.category}, Label: ${info.label}`);
        });


        if (filters.category && !filters.transactionType) {
          filteredTransactions = filteredTransactions.filter(transaction => {
            const info = getTransactionInfo(transaction.transaction_type);
            return info.category === transactionCategories[filters.category]?.label;
          });
        }

        setTransactions(filteredTransactions);
        setTotalTransactions(response.pagination?.total || filteredTransactions.length);
      } else {
        throw new Error(response.message || 'Erro ao carregar transações');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar transações:', err);
      setError('Erro ao carregar histórico de transações');
      setTransactions([]);
      setTotalTransactions(0);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));


    if (filterName === 'category') {
      setFilters(prev => ({
        ...prev,
        category: value,
        transactionType: ''
      }));
    }

    setPage(0);
  };

  const clearHistory = async () => {
    try {
      setClearing(true);

      console.log('🗑️ Iniciando limpeza do histórico de transações...');
      const response = await BlockchainService.deleteAllTransactions();

      if (response.success) {
        console.log('✅ Histórico limpo com sucesso');
        await loadTransactions();
        await loadInitialData();
      } else {
        throw new Error(response.message || 'Erro ao limpar histórico');
      }

      setShowClearDialog(false);
    } catch (err) {
      console.error('❌ Erro ao limpar histórico:', err);
      setError('Erro ao limpar histórico de transações');
    } finally {
      setClearing(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      transactionType: '',
      status: ''
    });
    setPage(0);
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteDialog(true);
  };

  const deleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      setDeleting(true);

      console.log('🗑️ Excluindo transação:', transactionToDelete.id);
      const response = await BlockchainService.deleteTransaction(transactionToDelete.id);

      if (response.success) {
        console.log('✅ Transação excluída com sucesso');
        await loadTransactions();
        await loadInitialData();
      } else {
        throw new Error(response.message || 'Erro ao excluir transação');
      }

      setShowDeleteDialog(false);
      setTransactionToDelete(null);
    } catch (err) {
      console.error('❌ Erro ao excluir transação:', err);
      setError('Erro ao excluir transação');
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetails(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <ConfirmedIcon color="success" />;
      case 'pending': return <PendingIcon color="warning" />;
      case 'failed': return <FailedIcon color="error" />;
      default: return <PendingIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };


  const getTransactionInfo = (type) => {

    for (const category of Object.values(transactionCategories)) {
      if (category.types[type]) {
        return {
          ...category.types[type],
          category: category.label,
          categoryColor: category.color,
          categoryIcon: category.icon
        };
      }
    }


    const typeMapping = {

      'BACKLOG_STATUS_UPDATE': 'backlog_status_update',
      'BACKLOG_CREATE': 'backlog_create',
      'BACKLOG_UPDATE': 'backlog_edit',
      'BACKLOG_DELETE': 'backlog_delete',
      'BACKLOG_ITEM_CREATION': 'backlog_create',
      'BACKLOG_ITEM_UPDATE': 'backlog_edit',
      'BACKLOG_ITEM_DELETION': 'backlog_delete',

      'SPRINT_CREATE': 'sprint_create',
      'SPRINT_UPDATE': 'sprint_edit',
      'SPRINT_STATUS_UPDATE': 'sprint_status_update',
      'SPRINT_STATUS_CHANGE': 'sprint_status_update',
      'SPRINT_DELETE': 'sprint_delete',
      'SPRINT_DELETION': 'sprint_delete',

      'TASK_CREATE': 'task_create',
      'TASK_UPDATE': 'task_edit',
      'TASK_STATUS_UPDATE': 'task_status_update',
      'TASK_STATUS_CHANGE': 'task_status_update',
      'TASK_ASSIGN': 'task_assign',
      'TASK_ASSIGNMENT': 'task_assign',
      'TASK_DELETE': 'task_delete',
      'TASK_DELETION': 'task_delete',

      'TEAM_CREATE': 'team_create',
      'TEAM_UPDATE': 'team_edit',
      'TEAM_DELETE': 'team_delete',
      'TEAM_DELETION': 'team_delete',
      'MEMBER_ADD': 'team_member_add',
      'MEMBER_REMOVE': 'team_member_remove',
      'MEMBER_UPDATE': 'team_member_edit',


      'updateTaskStatus': 'task_status_update',
      'sprint_creation': 'sprint_create',
      'registerTeam': 'team_create'
    };

    const mappedType = typeMapping[type];
    if (mappedType) {
      for (const category of Object.values(transactionCategories)) {
        if (category.types[mappedType]) {
          return {
            ...category.types[mappedType],
            category: category.label,
            categoryColor: category.color,
            categoryIcon: category.icon
          };
        }
      }
    }


    return {
      label: type,
      description: 'Tipo de transação não categorizado',
      icon: <InfoIcon />,
      color: 'default',
      category: 'Outros',
      categoryColor: 'default'
    };
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copiado para clipboard:', text);

    });
  };

  const openInBlockExplorer = (txHash) => {

    console.log('Explorador blockchain não configurado para:', txHash);


  };


  const getAvailableTypes = () => {
    if (!filters.category) {

      const allTypes = [];
      Object.values(transactionCategories).forEach(category => {
        Object.keys(category.types).forEach(type => {
          allTypes.push({ value: type, label: category.types[type].label });
        });
      });
      return allTypes;
    }


    const category = transactionCategories[filters.category];
    if (category) {
      return Object.keys(category.types).map(type => ({
        value: type,
        label: category.types[type].label
      }));
    }

    return [];
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {}
      <Box display="flex" alignItems="center" mb={4}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            <TimelineIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Histórico da Equipe
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Acompanhe todas as operações blockchain realizadas pelos membros da sua equipe Scrum
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Limpar filtros ativos">
            <IconButton
              onClick={clearFilters}
              disabled={!filters.category && !filters.transactionType && !filters.status}
              sx={{ bgcolor: 'warning.main', color: 'white', '&:hover': { bgcolor: 'warning.dark' }, '&:disabled': { bgcolor: 'grey.400' } }}
            >
              <FilterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Atualizar dados">
            <IconButton
              onClick={loadTransactions}
              disabled={refreshing}
              sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Limpar histórico completo">
            <IconButton
              onClick={() => setShowClearDialog(true)}
              sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && (
        <Fade in={!!error}>
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        </Fade>
      )}

      {}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Total de Transações
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {stats.total || 0}
                    </Typography>
                  </Box>
                  <StatsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Confirmadas
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {stats.confirmed || 0}
                    </Typography>
                  </Box>
                  <ConfirmedIcon sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Pendentes
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {stats.pending || 0}
                    </Typography>
                  </Box>
                  <PendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Falhadas
                    </Typography>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      {stats.failed || 0}
                    </Typography>
                  </Box>
                  <FailedIcon sx={{ fontSize: 40, color: 'error.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: '8px 8px 0 0' }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box display="flex" alignItems="center">
                <FilterIcon sx={{ mr: 2 }} />
                <Typography variant="h6">Filtros Avançados</Typography>
              </Box>
              {(filters.category || filters.transactionType || filters.status) && (
                <Chip
                  label="Ativos"
                  size="small"
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'white',
                    mr: 2,
                    fontWeight: 'bold'
                  }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    label="Categoria"
                    startAdornment={filters.category && transactionCategories[filters.category] ? (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        {transactionCategories[filters.category].icon}
                      </Box>
                    ) : null}
                  >
                    <MenuItem value="">
                      <Box display="flex" alignItems="center">
                        <CategoryIcon sx={{ mr: 2 }} />
                        Todas as Categorias
                      </Box>
                    </MenuItem>
                    {Object.entries(transactionCategories).map(([key, category]) => (
                      <MenuItem key={key} value={key}>
                        <Box display="flex" alignItems="center">
                          <Box sx={{ mr: 2, color: `${category.color}.main` }}>
                            {category.icon}
                          </Box>
                          {category.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Tipo de Transação</InputLabel>
                  <Select
                    value={filters.transactionType}
                    onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                    label="Tipo de Transação"
                    disabled={!filters.category && getAvailableTypes().length === 0}
                  >
                    <MenuItem value="">
                      <Box display="flex" alignItems="center">
                        <InfoIcon sx={{ mr: 2 }} />
                        Todos os Tipos
                      </Box>
                    </MenuItem>
                    {getAvailableTypes().map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box display="flex" alignItems="center">
                          {getTransactionInfo(type.value).icon && (
                            <Box sx={{ mr: 2 }}>{getTransactionInfo(type.value).icon}</Box>
                          )}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="pending">
                      <Box display="flex" alignItems="center">
                        <PendingIcon sx={{ mr: 1, color: 'warning.main' }} />
                        Pendente
                      </Box>
                    </MenuItem>
                    <MenuItem value="confirmed">
                      <Box display="flex" alignItems="center">
                        <ConfirmedIcon sx={{ mr: 1, color: 'success.main' }} />
                        Confirmada
                      </Box>
                    </MenuItem>
                    <MenuItem value="failed">
                      <Box display="flex" alignItems="center">
                        <FailedIcon sx={{ mr: 1, color: 'error.main' }} />
                        Falhada
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Card>

      {}
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, boxShadow: 3 }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                  Data/Hora
                </TableCell>
                <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                  Membro da Equipe
                </TableCell>
                <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                  Transação
                </TableCell>
                <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                  Tipo de Operação
                </TableCell>
                <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                  Status
                </TableCell>
                <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction, index) => {
                const transactionInfo = getTransactionInfo(transaction.transaction_type);
                return (
                  <TableRow
                    key={transaction.id}
                    hover
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'translateY(-1px)',
                        boxShadow: 1
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {format(parseISO(transaction.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(parseISO(transaction.created_at), 'HH:mm:ss', { locale: ptBR })}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'secondary.main',
                            fontSize: '0.875rem'
                          }}
                        >
                          {transaction.username ? transaction.username.charAt(0).toUpperCase() : 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {transaction.full_name || transaction.username || 'Usuário Desconhecido'}
                          </Typography>
                          {transaction.team_name && (
                            <Typography variant="caption" color="text.secondary">
                              {transaction.team_name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {transaction.transaction_hash ?
                              `${transaction.transaction_hash.slice(0, 8)}...${transaction.transaction_hash.slice(-6)}` :
                              'N/A'
                            }
                          </Typography>
                          {transaction.transaction_hash && (
                            <>
                              <Tooltip title="Copiar hash completo">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(transaction.transaction_hash)}
                                  sx={{ p: 0.5 }}
                                >
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Hash da transação blockchain
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: `${transactionInfo.categoryColor}.main`
                            }}
                          >
                            {transactionInfo.categoryIcon}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {transactionInfo.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {transactionInfo.category}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {transactionInfo.description}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(transaction.status)}
                        <Chip
                          label={transaction.status === 'confirmed' ? 'Confirmada' :
                            transaction.status === 'pending' ? 'Pendente' :
                              transaction.status === 'failed' ? 'Falhada' : 'Desconhecido'}
                          size="small"
                          color={getStatusColor(transaction.status)}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Ver detalhes completos">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(transaction)}
                            color="primary"
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir registro">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(transaction)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}

              {transactions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <TimelineIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3 }} />
                      <Typography variant="h6" color="text.secondary">
                        Nenhuma transação encontrada
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tente ajustar os filtros ou aguarde novas transações serem processadas
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalTransactions}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Transações por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        />
      </Paper>

      {}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box>
              <Typography variant="h6">Detalhes da Transação Blockchain</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Informações completas sobre a operação registrada
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selectedTransaction && (
            <Box>
              {/* Card de Informações da Operação */}
              <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Informações da Operação
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Realizado por:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: 'secondary.main',
                            fontSize: '1rem'
                          }}
                        >
                          {selectedTransaction.username ? selectedTransaction.username.charAt(0).toUpperCase() : 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {selectedTransaction.full_name || selectedTransaction.username || 'Usuário Desconhecido'}
                          </Typography>
                          {selectedTransaction.team_name && (
                            <Typography variant="caption" color="text.secondary">
                              Equipe: {selectedTransaction.team_name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Tipo de Operação:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getTransactionInfo(selectedTransaction.transaction_type).icon}
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {getTransactionInfo(selectedTransaction.transaction_type).label}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {getTransactionInfo(selectedTransaction.transaction_type).description}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Categoria:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getTransactionInfo(selectedTransaction.transaction_type).categoryIcon}
                        <Typography variant="body1">
                          {getTransactionInfo(selectedTransaction.transaction_type).category}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Informações Técnicas
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Hash da Transação:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>
                          {selectedTransaction.transaction_hash || 'N/A'}
                        </Typography>
                        {selectedTransaction.transaction_hash && (
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(selectedTransaction.transaction_hash)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Data e Hora:
                      </Typography>
                      <Typography variant="body1">
                        {format(parseISO(selectedTransaction.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Status:
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(selectedTransaction.status)}
                        <Chip
                          label={selectedTransaction.status === 'confirmed' ? 'Confirmada' :
                            selectedTransaction.status === 'pending' ? 'Pendente' :
                              selectedTransaction.status === 'failed' ? 'Falhada' : 'Desconhecido'}
                          size="small"
                          color={getStatusColor(selectedTransaction.status)}
                        />
                      </Box>
                    </Grid>

                    {selectedTransaction.user_address && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Endereço do Usuário:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                          {selectedTransaction.user_address}
                        </Typography>
                      </Grid>
                    )}

                    {selectedTransaction.block_number && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Número do Bloco:
                        </Typography>
                        <Typography variant="body1">
                          #{selectedTransaction.block_number}
                        </Typography>
                      </Grid>
                    )}

                    {selectedTransaction.network && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Rede:
                        </Typography>
                        <Typography variant="body1">
                          {selectedTransaction.network}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {selectedTransaction.description && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Descrição:
                  </Typography>
                  <Typography variant="body2">
                    {selectedTransaction.description}
                  </Typography>
                </Alert>
              )}

              {selectedTransaction.error_message && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Erro:
                  </Typography>
                  <Typography variant="body2">
                    {selectedTransaction.error_message}
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Stack direction="row" spacing={2}>
            {selectedTransaction?.transaction_hash && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => copyToClipboard(selectedTransaction.transaction_hash)}
                  startIcon={<CopyIcon />}
                >
                  Copiar Hash
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowDetails(false)}
              variant="contained"
              sx={{ ml: 'auto' }}
            >
              Fechar
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <ClearIcon />
            Confirmar Limpeza do Histórico
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            <strong>Atenção:</strong> Tem certeza que deseja limpar todo o histórico de transações blockchain?
          </DialogContentText>
          <Alert severity="warning">
            Esta ação é irreversível e removerá permanentemente todos os registros de transações do sistema.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowClearDialog(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={clearHistory}
            color="error"
            variant="contained"
            disabled={clearing}
            startIcon={clearing ? <CircularProgress size={20} /> : <ClearIcon />}
          >
            {clearing ? 'Limpando...' : 'Confirmar Limpeza'}
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon />
            Confirmar Exclusão
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir esta transação do histórico?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowDeleteDialog(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={deleteTransaction}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BlockchainHistoryPage;