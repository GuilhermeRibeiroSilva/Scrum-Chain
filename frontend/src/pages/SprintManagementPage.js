import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import {
  Container, Typography, Box, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Grid, Card, CardContent, Chip,
  FormControl, InputLabel, Select, MenuItem, Collapse, Divider,
  List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as TaskIcon,
  ExpandLess, ExpandMore,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  DirectionsRun as SprintIcon
} from '@mui/icons-material';

import BlockchainService from '../services/BlockchainService';
import { useWallet } from '../context/WalletContext';
import { ethers, BrowserProvider } from 'ethers';
import { TimeUtils } from '../utils/TimeUtils';
import contractAddresses from '../contracts/contract-addresses.json';
import SprintManagementABI from '../contracts/SprintManagement.json';
import TaskManagementABI from '../contracts/TaskManagement.json';
import ScrumTeamABI from '../contracts/ScrumTeam.json';

function SprintManagementPage() {
  const navigate = useNavigate();
  const {
    account,
    connectWallet,
    isConnected,
    isCorrectNetwork
  } = useWallet();
  const [currentTeam, setCurrentTeam] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successType, setSuccessType] = useState('success');
  const [openDialog, setOpenDialog] = useState(false);
  const [editSprint, setEditSprint] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);


  const [sprintContract, setSprintContract] = useState(null);
  const [taskContract, setTaskContract] = useState(null);
  const [scrumContract, setScrumContract] = useState(null);
  const [blockchainMapping, setBlockchainMapping] = useState({});


  const [tasks, setTasks] = useState({});
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [currentSprintId, setCurrentSprintId] = useState(null);
  const [expandedSprints, setExpandedSprints] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);


  const [openDeleteSprintDialog, setOpenDeleteSprintDialog] = useState(false);
  const [openDeleteTaskDialog, setOpenDeleteTaskDialog] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);


  const [backlogItems, setBacklogItems] = useState([]);
  const [hasBacklogItems, setHasBacklogItems] = useState(false);
  const [backlogLoaded, setBacklogLoaded] = useState(false);


  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    backlogId: ''
  });


  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    estimatedHours: '02:00'
  });


  const timeToMinutes = TimeUtils.timeToMinutes;
  const minutesToTime = TimeUtils.minutesToTime;
  const formatTimeDisplay = TimeUtils.formatTimeDisplay;


  const setSuccessWithType = (message, type = 'success') => {
    setSuccess(message);
    setSuccessType(type);
  };


  const originalSetSuccess = setSuccess;
  const customSetSuccess = (message, type = 'success') => {
    if (typeof message === 'string' && type) {
      setSuccessWithType(message, type);
    } else {
      originalSetSuccess(message);
      setSuccessType('success');
    }
  };


  const initializeContracts = async () => {
    try {
      if (window.ethereum && account) {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const sprintMgmt = new ethers.Contract(
          contractAddresses.SprintManagement,
          SprintManagementABI.abi,
          signer
        );

        const taskMgmt = new ethers.Contract(
          contractAddresses.TaskManagement,
          TaskManagementABI.abi,
          signer
        );

        const scrumTeam = new ethers.Contract(
          contractAddresses.ScrumTeam,
          ScrumTeamABI.abi,
          signer
        );

        setSprintContract(sprintMgmt);
        setTaskContract(taskMgmt);
        setScrumContract(scrumTeam);

        console.log('✅ SPRINTS: Contratos inicializados');
      }
    } catch (error) {
      console.error('❌ SPRINTS: Erro ao inicializar contratos:', error);
    }
  };


  const generateDataHash = (data) => {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return ethers.keccak256(ethers.toUtf8Bytes(dataString));
  };


  const getUserTeamSafely = async (contract, userAddress) => {
    try {

      if (currentTeam?.blockchain_id && currentTeam.blockchain_id > 0) {
        console.log('🔍 SPRINTS: Usando team ID dos dados locais:', currentTeam.blockchain_id);
        return Number(currentTeam.blockchain_id);
      }

      console.log('🔍 SPRINTS: Tentando buscar team ID da blockchain...');
      const teamId = await contract.getUserTeam(userAddress);
      console.log('🔍 SPRINTS: Team ID da blockchain:', teamId.toString());
      return Number(teamId.toString());
    } catch (error) {
      console.warn('⚠️ SPRINTS: Erro ao verificar equipe do usuário na blockchain:', error);

      if (currentTeam?.blockchain_id && currentTeam.blockchain_id > 0) {
        console.log('🔧 SPRINTS: Usando fallback - team ID dos dados locais:', currentTeam.blockchain_id);
        return Number(currentTeam.blockchain_id);
      }

      console.warn('⚠️ SPRINTS: Nenhum team ID disponível (blockchain + local)');
      return 0;
    }
  };


  const isTeamSyncedLocally = () => {
    return currentTeam?.blockchain_id && currentTeam.blockchain_id > 0;
  };


  const ensureTeamSync = async (actionName = "ação") => {
    if (!isTeamSyncedLocally()) {
      console.warn(`❌ SPRINTS: Usuário não possui equipe registrada na blockchain para ${actionName}.`);
      setError('❌ EQUIPE NÃO SINCRONIZADA: Por favor, vá para a página "Gerenciamento de Equipe" e sincronize sua equipe com a blockchain primeiro.');
      return false;
    }
    return true;
  };






  const autoSyncBlockchain = async () => {
    if (!currentTeam || !sprintContract || !taskContract || !scrumContract || !account) {
      return;
    }

    try {
      setLoadingAction(true);
      console.log('⚡ SPRINTS: Iniciando sincronização automática...');


      if (!isTeamSyncedLocally()) {
        console.log('⚡ SPRINTS: Sincronizando equipe para blockchain...');
        customSetSuccess('Sincronizando equipe com blockchain...', 'success');

        try {

          const teamHash = generateDataHash({
            name: currentTeam.name,
            description: currentTeam.description || '',
            createdBy: account
          });

          const tx = await scrumContract.registerTeam(teamHash);


          const receipt = await tx.wait();
          console.log('✅ Transação confirmada:', receipt.transactionHash);

          console.log('✅ SPRINTS: Equipe sincronizada com blockchain');
          customSetSuccess('✅ Equipe sincronizada com blockchain!', 'success');
        } catch (teamError) {
          if (teamError.message.includes('User already belongs to a team')) {
            console.log('✅ SPRINTS: Equipe já estava registrada na blockchain');
            customSetSuccess('✅ Equipe já sincronizada!', 'success');
          } else {
            console.warn('⚠️ SPRINTS: Erro ao sincronizar equipe:', teamError);


            console.error('❌ Erro na transação:', teamError.message);
            throw teamError;
          }
        }
      } else {
        console.log('✅ SPRINTS: Equipe já está sincronizada na blockchain');
      }

      customSetSuccess('✅ Sincronização concluída!', 'success');
      console.log('✅ SPRINTS: Sincronização automática concluída');


      setTimeout(async () => {
        await updateSprintMappingAfterBlockchainOperation();
      }, 500);

    } catch (error) {
      console.error('❌ SPRINTS: Erro na sincronização automática:', error);
      setError('Erro na sincronização. Verifique se você é membro da equipe na blockchain.');
    } finally {
      setLoadingAction(false);
    }
  };


  useEffect(() => {
    if (isConnected && isCorrectNetwork && account) {
      initializeContracts();
    }
  }, [isConnected, isCorrectNetwork, account]);


  useEffect(() => {
    if (currentTeam && sprintContract && taskContract && scrumContract && account && !loadingAction) {
      autoSyncBlockchain();
    }
  }, [currentTeam, sprintContract, taskContract, scrumContract, account]);


  useEffect(() => {
    if (sprints.length > 0 && sprintContract && scrumContract && account) {
      updateSprintMappingAfterBlockchainOperation();
    }
  }, [sprints, sprintContract, scrumContract, account]);


  const getBlockchainSprintId = async (sprintDbId) => {
    if (!sprintContract || !scrumContract || !currentTeam) {
      return null;
    }

    try {
      console.log('🔍 Buscando ID da blockchain para sprint DB:', sprintDbId);


      const sprintData = sprints.find(s => s.id === sprintDbId);
      if (!sprintData) {
        console.warn('⚠️ Sprint não encontrado nos dados locais:', sprintDbId);
        return null;
      }


      let userTeamId = null;


      if (currentTeam.blockchain_id && currentTeam.blockchain_id !== 'undefined' && currentTeam.blockchain_id !== 'null') {
        try {
          userTeamId = parseInt(currentTeam.blockchain_id);
          if (isNaN(userTeamId) || userTeamId <= 0) {
            userTeamId = null;
          }
        } catch (e) {
          userTeamId = null;
        }
      }


      if (!userTeamId) {
        try {
          const teamIdFromContract = await getUserTeamSafely(scrumContract, account);
          if (teamIdFromContract && teamIdFromContract.toString() !== '0') {
            userTeamId = teamIdFromContract;
          }
        } catch (e) {
          console.warn('⚠️ Erro ao obter team ID via contrato:', e.message);
        }
      }

      if (!userTeamId || userTeamId.toString() === '0') {
        console.warn('⚠️ Team ID não encontrado para buscar sprints. Team data:', {
          id: currentTeam.id,
          blockchain_id: currentTeam.blockchain_id
        });
        return null;
      }

      console.log('🔍 Usando team ID:', userTeamId.toString());


      let teamSprintIds = [];
      try {
        teamSprintIds = await sprintContract.getTeamSprints(userTeamId);
        console.log('🔍 Sprints da equipe na blockchain:', teamSprintIds.map(id => id.toString()));
      } catch (getSprintsError) {
        console.warn('⚠️ Erro ao obter sprints da equipe:', getSprintsError.message);

        return null;
      }


      const sprintHash = generateDataHash({
        name: sprintData.name,
        description: sprintData.description || '',
        startDate: sprintData.start_date || sprintData.startDate,
        endDate: sprintData.end_date || sprintData.endDate
      });

      console.log('🔍 Hash procurado:', sprintHash);
      console.log('🔍 Dados do sprint:', {
        name: sprintData.name,
        description: sprintData.description,
        startDate: sprintData.start_date,
        endDate: sprintData.end_date
      });

      for (let i = 0; i < teamSprintIds.length; i++) {
        const blockchainSprintId = teamSprintIds[i];
        try {
          console.log('🔍 Verificando sprint blockchain ID:', blockchainSprintId.toString());
          const sprintInfo = await sprintContract.getSprintInfo(blockchainSprintId);
          console.log('🔍 Sprint', blockchainSprintId.toString(), 'hash:', sprintInfo[7]);

          if (sprintInfo[7] === sprintHash) {
            console.log('✅ Sprint encontrado! DB ID:', sprintDbId, '→ Blockchain ID:', blockchainSprintId.toString());
            return blockchainSprintId;
          }
        } catch (sprintInfoError) {
          console.warn('⚠️ Erro ao verificar sprint', blockchainSprintId.toString(), ':', sprintInfoError.message);
        }
      }

      console.warn('⚠️ Sprint não encontrado na blockchain por hash. DB ID:', sprintDbId);
      return null;

    } catch (error) {
      console.error('❌ Erro ao buscar ID do sprint na blockchain:', error);
      return null;
    }
  };
  const getBlockchainSprintMapping = async () => {
    if (!sprintContract || !scrumContract || !currentTeam || !account) {
      console.log('⚠️ SPRINTS: Contratos ou dados necessários não disponíveis para mapeamento');
      return {};
    }

    if (!sprints || sprints.length === 0) {
      console.warn('⚠️ SPRINTS: Array sprints vazio - não há dados para mapear');
      return {};
    }

    console.log('🔍 SPRINTS: Iniciando mapeamento. Total de sprints:', sprints.length);
    console.log('🔍 SPRINTS: Sprints disponíveis:', sprints.map(s => ({
      id: s.id,
      name: s.name,
      blockchain_address: s.blockchain_address,
      backlog_id: s.backlog_id
    })));

    try {
      console.log('🔍 SPRINTS: Criando mapeamento usando dados do PostgreSQL...');
      const mapping = {};


      sprints.forEach(dbSprint => {

        const blockchainAddress = dbSprint.blockchain_address;
        console.log(`🔍 SPRINTS: Sprint ${dbSprint.id} (${dbSprint.name}) - blockchain_address: ${blockchainAddress}`);

        if (blockchainAddress && blockchainAddress !== 'null' && blockchainAddress !== '0' && blockchainAddress.trim() !== '') {
          mapping[dbSprint.id] = {
            blockchainId: blockchainAddress,
            dataHash: generateDataHash({
              name: dbSprint.name,
              description: dbSprint.description || '',
              startDate: dbSprint.start_date || dbSprint.startDate,
              endDate: dbSprint.end_date || dbSprint.endDate
            }),
            status: dbSprint.status === 'planning' ? 0 :
              dbSprint.status === 'active' ? 1 :
                dbSprint.status === 'completed' ? 2 : 3
          };
          console.log('✅ SPRINTS: Mapeamento - DB ID:', dbSprint.id, '→ Blockchain Address:', blockchainAddress);
        } else {
          console.log('⚠️ SPRINTS: Sprint sem blockchain_address:', dbSprint.id);
        }
      });

      console.log('� SPRINTS: Mapeamento criado com', Object.keys(mapping).length, 'sprints sincronizados');
      return mapping;

    } catch (error) {
      console.error('❌ SPRINTS: Erro ao obter mapeamento de sprints:', error);
      return {};
    }
  };


  const getBlockchainSprintMappingSync = (sprintsArray) => {
    if (!sprintContract || !scrumContract || !currentTeam || !account) {
      console.log('⚠️ SPRINTS: Contratos ou dados necessários não disponíveis para mapeamento');
      return {};
    }

    if (!sprintsArray || sprintsArray.length === 0) {
      console.warn('⚠️ SPRINTS: Array sprints vazio - não há dados para mapear');
      return {};
    }

    console.log('🔍 SPRINTS SYNC: Iniciando mapeamento. Total de sprints:', sprintsArray.length);
    console.log('🔍 SPRINTS SYNC: Sprints disponíveis:', sprintsArray.map(s => ({
      id: s.id,
      name: s.name,
      blockchain_address: s.blockchain_address,
      backlog_id: s.backlog_id
    })));

    try {
      console.log('🔍 SPRINTS SYNC: Criando mapeamento usando dados do PostgreSQL...');
      const mapping = {};


      sprintsArray.forEach(dbSprint => {

        const blockchainAddress = dbSprint.blockchain_address;
        console.log(`🔍 SPRINTS SYNC: Sprint ${dbSprint.id} (${dbSprint.name}) - blockchain_address: ${blockchainAddress}`);

        if (blockchainAddress && blockchainAddress !== 'null' && blockchainAddress !== '0' && blockchainAddress.trim() !== '') {
          mapping[dbSprint.id] = {
            blockchainId: blockchainAddress,
            dataHash: generateDataHash({
              name: dbSprint.name,
              description: dbSprint.description || '',
              startDate: dbSprint.start_date || dbSprint.startDate,
              endDate: dbSprint.end_date || dbSprint.endDate
            }),
            status: dbSprint.status === 'planning' ? 0 :
              dbSprint.status === 'active' ? 1 :
                dbSprint.status === 'completed' ? 2 : 3
          };
          console.log('✅ SPRINTS SYNC: Mapeamento - DB ID:', dbSprint.id, '→ Blockchain Address:', blockchainAddress);
        } else {
          console.log('⚠️ SPRINTS SYNC: Sprint sem blockchain_address:', dbSprint.id);
        }
      });

      console.log('📊 SPRINTS SYNC: Mapeamento criado com', Object.keys(mapping).length, 'sprints sincronizados');
      return mapping;

    } catch (error) {
      console.error('❌ SPRINTS SYNC: Erro ao obter mapeamento de sprints:', error);
      return {};
    }
  };


  const updateSprintMappingAfterBlockchainOperation = async () => {
    if (sprintContract && scrumContract && account && currentTeam?.id) {
      try {
        console.log('🗺️ SPRINTS: Atualizando mapeamento após operação blockchain...');


        setTimeout(() => {

          const mapping = getBlockchainSprintMappingSync(sprints);
          setBlockchainMapping(mapping);
          console.log('✅ SPRINTS: Mapeamento atualizado:', mapping);
        }, 300);

      } catch (error) {
        console.warn('⚠️ SPRINTS: Erro ao atualizar mapeamento:', error);
        return {};
      }
    }
    return {};
  };


  const loadTeamMembers = async () => {
    if (!currentTeam?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTeamMembers(result.data);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar membros:', error);
    }
  };


  const loadTasks = async (sprintId) => {
    if (!currentTeam?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprintId}/tasks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTasks(prev => ({
            ...prev,
            [sprintId]: result.data
          }));
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tasks:', error);
    }
  };



  const handleSaveTask = async () => {
    if (!taskFormData.title.trim()) {
      setError('Título da tarefa é obrigatório');
      return;
    }

    if (!currentSprintId) {
      setError('Sprint não identificado');
      return;
    }

    if (!isConnected) {
      setError('Conecte sua carteira MetaMask para salvar tarefas');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Troque para a rede Hardhat no MetaMask');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);
      setSuccess(null);



      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        assignedTo: taskFormData.assignedTo ? parseInt(taskFormData.assignedTo) : null,
        estimatedHours: TimeUtils.toBackend(taskFormData.estimatedHours)
      };


      console.log('📝 1. Salvando tarefa no PostgreSQL...');
      const token = localStorage.getItem('token');
      const url = editTask
        ? `${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${editTask.id}`
        : `${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${currentSprintId}/tasks`;

      const method = editTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar tarefa no banco');
      }

      const result = await response.json();
      const taskId = editTask ? editTask.id : result.data.id;
      console.log(`✅ 1. Tarefa ${editTask ? 'atualizada' : 'criada'} no PostgreSQL - ID:`, taskId);


      let tx, receipt;


      if (taskContract && scrumContract) {
        console.log('🔗 2. Registrando tarefa na blockchain...');


        if (!isTeamSyncedLocally()) {
          throw new Error('Equipe não está sincronizada com blockchain. Sincronize a equipe primeiro.');
        }

        if (editTask) {

          const blockchainTaskId = editTask.blockchain_address;

          if (!blockchainTaskId) {
            throw new Error('Tarefa não registrada na blockchain para atualização');
          }


          tx = await taskContract.updateTaskDataHash(blockchainTaskId, generateDataHash(taskData));


          receipt = await tx.wait();
          console.log('✅ 2. Tarefa atualizada na blockchain - Hash:', tx.hash);


          console.log('💾 3. Atualizando transactionHash no banco...');
          try {
            await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${editTask.id}/transaction-hash`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionHash: tx.hash
              })
            });
            console.log('✅ 3. TransactionHash atualizado no banco');
          } catch (hashError) {
            console.warn('⚠️ Erro ao atualizar transactionHash (não crítico):', hashError);
          }

          customSetSuccess(`✅ Sucesso! Tarefa atualizada. Hash: ${tx.hash}`, 'success');
        } else {

          console.log('🔍 Buscando sprint na blockchain para criar tarefa...');
          console.log('🔍 Current Sprint ID:', currentSprintId);



          let blockchainSprintId = currentSprintId;

          console.log('🔗 Usando Sprint ID direto do banco:', blockchainSprintId);


          let assignedToAddress = null;
          if (taskFormData.assignedTo) {
            const assignedMember = teamMembers.find(m => m.user_id === parseInt(taskFormData.assignedTo));
            assignedToAddress = assignedMember?.wallet_address || null;
          }

          const taskHash = generateDataHash(taskData);
          const estimatedMinutes = TimeUtils.toBackend(taskFormData.estimatedHours);

          console.log('⚡ REGISTRANDO TASK - Parâmetros:', {
            sprintId: blockchainSprintId,
            assignedTo: assignedToAddress || account,
            estimatedMinutes,
            timeInput: taskFormData.estimatedHours,
            taskHash
          });


          const tx = await taskContract.registerTask(
            blockchainSprintId,
            assignedToAddress || account,
            estimatedMinutes,
            taskHash
          );


          receipt = await tx.wait();
          console.log('✅ 2. Tarefa criada na blockchain - Hash:', tx.hash);


          let blockchainTaskId = null;
          if (receipt.logs && receipt.logs.length > 0) {
            try {
              const taskCreatedEvent = receipt.logs.find(log =>
                log.topics[0] === ethers.id("TaskCreated(uint256,uint256,address,bytes32)")
              );
              if (taskCreatedEvent) {
                blockchainTaskId = parseInt(taskCreatedEvent.topics[1], 16);
              }
            } catch (eventError) {
              console.warn('⚠️ Erro ao extrair taskId do evento:', eventError);
            }
          }


          console.log('💾 3. Atualizando blockchain_address e transactionHash no banco...');
          try {
            await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${taskId}/blockchain-sync`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                blockchainAddress: blockchainTaskId,
                transactionHash: tx.hash
              })
            });
            console.log('✅ 3. Blockchain_address e transactionHash atualizados no banco');
          } catch (hashError) {
            throw new Error('Erro ao sincronizar dados blockchain no banco');
          }

          customSetSuccess(`✅ Tarefa ${editTask ? 'atualizada' : 'criada'} na blockchain! Hash: ${tx.hash}`, 'success');
        }
      }


      if (taskContract && receipt) {
        console.log('💾 4. Salvando transação na blockchain_transactions...');
        try {
          await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${taskId}/blockchain-transaction`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionHash: receipt.transactionHash,
              contractName: 'TaskManagement',
              methodName: editTask ? 'updateTaskDataHash' : 'registerTask',
              gasUsed: receipt.gasUsed?.toString(),
              gasPrice: receipt.gasPrice?.toString(),
              blockNumber: receipt.blockNumber,
              network: 'localhost',
              taskTitle: taskData.title,
              description: `Tarefa "${taskData.title}" ${editTask ? 'atualizada' : 'criada'}`
            })
          });
          console.log('✅ 4. Transação salva na blockchain_transactions');
        } catch (transactionError) {
          console.warn('⚠️ Erro ao salvar transação (não crítico):', transactionError);
        }
      }

      setOpenTaskDialog(false);
      resetTaskForm();
      await loadTasks(currentSprintId);

    } catch (error) {
      console.error('❌ Erro ao salvar tarefa:', error);

      if (error.code === 4001) {
        setError('Transação cancelada pelo usuário');
      } else if (error.code === -32603) {
        setError('Erro na rede blockchain. Verifique se a rede Hardhat está rodando');
      } else {
        setError(error.message || 'Erro ao salvar tarefa');
      }
    } finally {
      setLoadingAction(false);
    }
  };


  const handleDeleteTask = async (taskId) => {
    setTaskToDelete(taskId);
    setOpenDeleteTaskDialog(true);
  };


  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    setOpenDeleteTaskDialog(false);

    if (!isConnected) {
      setError('Conecte sua carteira MetaMask para excluir a tarefa');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Troque para a rede Hardhat no MetaMask');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);
      setSuccess(null);




      const currentTasks = tasks[currentSprintId] || [];
      const task = currentTasks.find(t => t.id === taskToDelete);


      console.log('📝 1. Excluindo tarefa do PostgreSQL...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${taskToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir tarefa do banco');
      }

      console.log('✅ 1. Tarefa excluída do PostgreSQL - ID:', taskToDelete);


      if (taskContract && scrumContract && task?.blockchain_address) {
        console.log('🔗 2. Removendo tarefa da blockchain...');


        if (!isTeamSyncedLocally()) {
          throw new Error('Equipe não está sincronizada com blockchain. Sincronize a equipe primeiro.');
        }

        const blockchainTaskId = task.blockchain_address;


        const tx = await taskContract.removeTask(blockchainTaskId);


        const receipt = await tx.wait();
        console.log('✅ 2. Tarefa removida da blockchain - Hash:', tx.hash);





        console.log('💾 4. Salvando transação na blockchain_transactions...');
        try {
          await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${taskToDelete}/blockchain-transaction`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionHash: tx.hash,
              contractName: 'TaskManagement',
              methodName: 'removeTask',
              gasUsed: receipt.gasUsed?.toString(),
              gasPrice: receipt.gasPrice?.toString(),
              blockNumber: receipt.blockNumber,
              network: 'localhost',
              taskTitle: task.title || 'Tarefa',
              description: `Tarefa "${task.title || 'Sem título'}" removida/excluída`
            })
          });

          console.log('✅ 4. Transação salva na blockchain_transactions');
        } catch (transactionError) {
          console.warn('⚠️ Erro ao salvar transação (não crítico):', transactionError);
        }

        customSetSuccess(`✅ Sucesso! Tarefa excluída. Hash: ${tx.hash}`, 'success');
      } else {
        customSetSuccess('✅ Sucesso! Tarefa excluída do banco de dados. (Tarefa não existia na blockchain)', 'success');
      }

      await loadTasks(currentSprintId);

    } catch (error) {
      console.error('❌ Erro ao excluir tarefa:', error);

      if (error.code === 4001) {
        setError('Transação cancelada pelo usuário');
      } else if (error.code === -32603) {
        setError('Erro na rede blockchain. Verifique se a rede Hardhat está rodando');
      } else {
        setError(error.message || 'Erro ao excluir tarefa');
      }
    } finally {
      setLoadingAction(false);
    }
  };


  const cancelDeleteTask = () => {
    setOpenDeleteTaskDialog(false);
    setTaskToDelete(null);
  };


  const cancelDeleteSprint = () => {
    setOpenDeleteSprintDialog(false);
    setSprintToDelete(null);
  };


  const handleTaskStatusChange = async (taskId, newStatus) => {
    if (!isConnected) {
      setError('Conecte sua carteira MetaMask para alterar o status');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Troque para a rede Hardhat no MetaMask');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);
      setSuccess(null);




      let task = null;
      let taskSprintId = null;


      for (const sprintId in tasks) {
        const sprintTasks = tasks[sprintId] || [];
        const foundTask = sprintTasks.find(t => t.id === taskId);
        if (foundTask) {
          task = foundTask;
          taskSprintId = parseInt(sprintId);
          break;
        }
      }

      if (!task) {
        throw new Error('Tarefa não encontrada nos dados carregados');
      }

      console.log('✅ Dados da tarefa obtidos:', task);


      console.log('📝 1. Atualizando status da tarefa no PostgreSQL...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar status no banco');
      }

      console.log('✅ 1. Status da tarefa atualizado no PostgreSQL');


      if (taskContract && scrumContract && task?.blockchain_address) {
        console.log('🔗 2. Atualizando status na blockchain...');


        if (!isTeamSyncedLocally()) {
          throw new Error('Equipe não está sincronizada com blockchain. Sincronize a equipe primeiro.');
        }

        const blockchainTaskId = task.blockchain_address;


        const statusMapping = { 'todo': 0, 'in_progress': 1, 'review': 2, 'done': 3, 'removed': 4 };
        const statusId = statusMapping[newStatus] || 0;


        const tx = await taskContract.updateTaskStatus(blockchainTaskId, statusId);


        const receipt = await tx.wait();
        console.log('✅ 2. Status atualizado na blockchain - Hash:', tx.hash);


        console.log('💾 3. Atualizando transactionHash no banco...');
        try {
          await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${taskId}/transaction-hash`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionHash: tx.hash
            })
          });
          console.log('✅ 3. TransactionHash atualizado no banco');
        } catch (hashError) {
          console.warn('⚠️ Erro ao atualizar transactionHash (não crítico):', hashError);
        }


        console.log('💾 4. Salvando transação na blockchain_transactions...');
        try {
          await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/tasks/${taskId}/blockchain-transaction`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionHash: tx.hash,
              contractName: 'TaskManagement',
              methodName: 'updateTaskStatus',
              gasUsed: receipt.gasUsed?.toString(),
              gasPrice: receipt.gasPrice?.toString(),
              blockNumber: receipt.blockNumber,
              network: 'localhost',
              taskTitle: task.title || 'Tarefa',
              description: `Status da tarefa "${task.title || 'Sem título'}" alterado para ${newStatus}`
            })
          });

          console.log('✅ 4. Transação salva na blockchain_transactions');
        } catch (transactionError) {
          console.warn('⚠️ Erro ao salvar transação (não crítico):', transactionError);
        }

        customSetSuccess(`✅ Status alterado na blockchain! Hash: ${tx.hash}`, 'success');
      }


      if (taskSprintId) {
        await loadTasks(taskSprintId);
      }

    } catch (error) {
      console.error('❌ Erro ao alterar status da tarefa:', error);

      if (error.code === 4001) {
        setError('Transação cancelada pelo usuário');
      } else if (error.code === -32603) {
        setError('Erro na rede blockchain. Verifique se a rede Hardhat está rodando');
      } else {
        setError(error.message || 'Erro ao alterar status');
      }
    } finally {
      setLoadingAction(false);
    }
  };


  const resetTaskForm = () => {
    setTaskFormData({
      title: '',
      description: '',
      assignedTo: '',
      estimatedHours: '02:00'
    });
    setEditTask(null);
  };


  const handleEditTask = (task) => {
    setEditTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assigned_to || '',
      estimatedHours: task.estimated_minutes ? TimeUtils.fromBackend(task.estimated_minutes) : '00:00'
    });
    setOpenTaskDialog(true);
  };


  const toggleSprintExpansion = async (sprintId) => {
    const isExpanded = expandedSprints[sprintId];

    setExpandedSprints(prev => ({
      ...prev,
      [sprintId]: !isExpanded
    }));


    if (!isExpanded && !tasks[sprintId]) {
      await loadTasks(sprintId);
    }
  };


  const checkUserTeam = async () => {
    try {
      console.log('🔍 SPRINTS: Verificando equipe do usuário...');
      const token = localStorage.getItem('token');

      if (!token) {
        console.log('❌ SPRINTS: Token não encontrado');
        setCurrentTeam(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/groups/user-team`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SPRINTS: Resposta da verificação de equipe:', result);

        if (result.success && result.data) {
          setCurrentTeam(result.data);
          console.log('✅ SPRINTS: Equipe encontrada:', result.data.name, 'Papel:', result.data.member_role);
        } else {
          console.log('⚠️ SPRINTS: Usuário não possui equipe ativa');
          setCurrentTeam(null);
        }
      } else {
        console.error('❌ SPRINTS: Erro ao verificar equipe do usuário');
        setError('Erro ao verificar dados da equipe');
        setCurrentTeam(null);
      }
    } catch (error) {
      console.error('❌ SPRINTS: Erro na verificação:', error);
      setError('Erro de conexão com o servidor');
      setCurrentTeam(null);
    } finally {
      setLoading(false);
    }
  };


  const loadSprints = async () => {
    if (!currentTeam?.id) {
      console.log('⚠️ Nenhuma equipe ativa encontrada');
      setSprints([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Sprints carregados:', result);

        if (result.success && result.data) {
          console.log('🔍 SPRINTS: Dados brutos do backend:', result.data);


          result.data.forEach(sprint => {
            console.log(`📋 Sprint ${sprint.id} (${sprint.name}):`);
            console.log(`   - backlog_id: ${sprint.backlog_id}`);
            console.log(`   - blockchain_address: ${sprint.blockchain_address}`);
            console.log(`   - backlog_title: ${sprint.backlog_title}`);
          });

          const processedSprints = result.data.map(sprint => ({
            id: sprint.id,
            name: sprint.name,
            description: sprint.description,
            startDate: new Date(sprint.start_date || sprint.startDate),
            endDate: new Date(sprint.end_date || sprint.endDate),
            status: sprint.status || 'planning',
            createdBy: sprint.created_by,
            createdByUsername: sprint.created_by_username,
            createdAt: new Date(sprint.created_at || sprint.createdAt),
            updatedAt: new Date(sprint.updated_at || sprint.updatedAt),
            blockchainId: sprint.blockchain_address || sprint.blockchainAddress || sprint.blockchainId,
            transactionHash: sprint.transaction_hash || sprint.transactionHash,

            backlog_id: sprint.backlog_id,
            backlog_title: sprint.backlog_title
          }));


          console.log('🔄 Sprints processados com backlog:', processedSprints.map(s => ({
            id: s.id,
            name: s.name,
            backlog_id: s.backlog_id,
            backlog_title: s.backlog_title
          })));


          processedSprints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          setSprints(processedSprints);
          return processedSprints;
        } else {
          setSprints([]);
          return [];
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao carregar sprints');
        setSprints([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar sprints:', error);
      setError('Erro de conexão ao carregar sprints');
      setSprints([]);
      return [];
    } finally {
      setLoading(false);
    }
  };


  const checkBacklogItems = async () => {
    if (backlogLoaded) {
      console.log('⏭️ Backlog já verificado, pulando...');
      return;
    }

    console.log('🔍 INICIANDO VERIFICAÇÃO DO BACKLOG...');
    if (!currentTeam?.id) {
      console.log('⚠️ Nenhuma equipe ativa encontrada para verificar backlog');
      setBacklogItems([]);
      setHasBacklogItems(false);
      setBacklogLoaded(true);
      return;
    }

    try {
      console.log('🔍 Verificando backlog para equipe ID:', currentTeam.id);
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/backlog/group/${currentTeam.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Resposta da API de backlog:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📋 Dados do backlog recebidos:', result);

        if (result.success && result.data) {
          const items = Array.isArray(result.data) ? result.data : [];
          console.log('📊 Itens do backlog processados:', items.length);

          setBacklogItems(items);
          setHasBacklogItems(items.length > 0);

          console.log(`✅ Estado atualizado - hasBacklogItems: ${items.length > 0}, total de itens: ${items.length}`);
        } else {
          console.log('❌ Resultado inválido da API');
          setBacklogItems([]);
          setHasBacklogItems(false);
        }
      } else {
        console.warn('⚠️ Erro ao verificar itens do backlog, status:', response.status);
        setBacklogItems([]);
        setHasBacklogItems(false);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar backlog:', error);
      setBacklogItems([]);
      setHasBacklogItems(false);
    } finally {
      setBacklogLoaded(true);
    }
  };


  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Nome do sprint é obrigatório');
      return;
    }

    if (!formData.backlogId) {
      setError('Selecionar um item do backlog é obrigatório');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Datas de início e fim são obrigatórias');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('Data de início deve ser anterior à data de fim');
      return;
    }

    if (!currentTeam?.id) {
      setError('Nenhuma equipe ativa encontrada');
      return;
    }

    if (!isConnected) {
      setError('Conecte sua carteira MetaMask para criar sprints');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Troque para a rede Hardhat no MetaMask');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);
      setSuccess(null);



      const sprintData = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: editSprint ? editSprint.status : 'planning',
        backlogId: formData.backlogId || null
      };

      console.log('📊 Dados do sprint para salvar:', sprintData);


      console.log('� 1. Salvando sprint no PostgreSQL...');
      const token = localStorage.getItem('token');
      const url = editSprint
        ? `${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${editSprint.id}`
        : `${getApiUrl()}/api/groups/${currentTeam.id}/sprints`;

      const method = editSprint ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sprintData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar sprint no banco');
      }

      const result = await response.json();
      const sprintId = editSprint ? editSprint.id : result.data.id;
      console.log(`✅ 1. Sprint ${editSprint ? 'atualizado' : 'criado'} no PostgreSQL - ID:`, sprintId);


      let tx, receipt;


      if (sprintContract && scrumContract) {
        console.log('� 2. Registrando sprint na blockchain...');


        if (!isTeamSyncedLocally()) {
          throw new Error('Equipe não está sincronizada com blockchain. Sincronize a equipe primeiro.');
        }

        if (editSprint) {

          const blockchainSprintId = editSprint.blockchain_address;

          if (!blockchainSprintId || blockchainSprintId === 'null' || blockchainSprintId === '0' || blockchainSprintId.trim() === '') {
            console.warn('⚠️ Sprint não registrado na blockchain. Criando novo registro...');

            const sprintHash = generateDataHash(sprintData);
            const userTeamId = currentTeam.blockchain_id || await getUserTeamSafely(scrumContract, account);


            const startTimestamp = Math.floor(new Date(sprintData.startDate).getTime() / 1000);
            const endTimestamp = Math.floor(new Date(sprintData.endDate).getTime() / 1000);

            tx = await sprintContract.registerSprint(userTeamId, startTimestamp, endTimestamp, sprintHash);

            receipt = await tx.wait();
            console.log('✅ 2. Sprint criado na blockchain - Hash:', tx.hash);


            let blockchainSprintIdFromEvent = null;
            if (receipt.logs && receipt.logs.length > 0) {
              try {
                const sprintRegisteredEvent = receipt.logs.find(log =>
                  log.topics[0] === ethers.id("SprintRegistered(uint256,uint256,address,uint256,uint256,bytes32,uint256)")
                );
                if (sprintRegisteredEvent) {
                  blockchainSprintIdFromEvent = parseInt(sprintRegisteredEvent.topics[1], 16);
                }
              } catch (eventError) {
                console.warn('⚠️ Erro ao extrair sprintId do evento:', eventError);
              }
            }


            console.log('💾 3. Atualizando blockchain_address no banco...');
            const syncResponse = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprintId}/blockchain-sync`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                blockchainId: tx.hash,
                transactionHash: tx.hash
              })
            });

            if (!syncResponse.ok) {
              throw new Error('Erro ao sincronizar blockchain_address no banco');
            }
            console.log('✅ 3. Blockchain_address atualizado no banco');

            customSetSuccess(`✅ Sprint atualizado na blockchain! Hash: ${tx.hash}`, 'success');
          } else {

            const sprintHash = generateDataHash(sprintData);

            tx = await sprintContract.updateSprintDataHash(blockchainSprintId, sprintHash);

            receipt = await tx.wait();
            console.log('✅ 2. Sprint atualizado na blockchain - Hash:', tx.hash);


            console.log('💾 3. Atualizando transactionHash no banco...');
            try {
              await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprintId}/transaction-hash`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transactionHash: tx.hash
                })
              });
              console.log('✅ 3. TransactionHash atualizado no banco');
            } catch (hashError) {
              console.warn('⚠️ Erro ao atualizar transactionHash (não crítico):', hashError);
            }

            customSetSuccess(`✅ Sucesso! Sprint atualizado. Hash: ${tx.hash}`, 'success');
          }
        } else {

          const sprintHash = generateDataHash(sprintData);


          const startTimestamp = Math.floor(new Date(sprintData.startDate).getTime() / 1000);
          const endTimestamp = Math.floor(new Date(sprintData.endDate).getTime() / 1000);


          const userTeamId = currentTeam.blockchain_id || await getUserTeamSafely(scrumContract, account);
          tx = await sprintContract.registerSprint(userTeamId, startTimestamp, endTimestamp, sprintHash);


          receipt = await tx.wait();
          console.log('✅ 2. Sprint criado na blockchain - Hash:', tx.hash);


          let blockchainSprintId = null;
          if (receipt.logs && receipt.logs.length > 0) {
            try {
              console.log('🔍 Logs do receipt:', receipt.logs.length, 'logs encontrados');
              const sprintRegisteredEvent = receipt.logs.find(log =>
                log.topics[0] === ethers.id("SprintRegistered(uint256,uint256,address,uint256,uint256,bytes32,uint256)")
              );
              console.log('🔍 Evento SprintRegistered encontrado:', !!sprintRegisteredEvent);
              if (sprintRegisteredEvent) {
                blockchainSprintId = parseInt(sprintRegisteredEvent.topics[1], 16);
                console.log('✅ Sprint ID extraído do evento:', blockchainSprintId);
              }
            } catch (eventError) {
              console.warn('⚠️ Erro ao extrair sprintId do evento:', eventError);
            }
          }

          console.log('🔗 IDs para atualizar banco:', {
            sprintId,
            blockchainSprintId,
            transactionHash: tx.hash
          });


          console.log('� 3. Atualizando blockchain_id e transactionHash no banco...');
          try {
            await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprintId}/blockchain-sync`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                blockchainId: blockchainSprintId ? blockchainSprintId.toString() : tx.hash,
                transactionHash: tx.hash
              })
            });
            console.log('✅ 3. Blockchain_address e transactionHash atualizados no banco');


            console.log('🔄 Recarregando sprints após atualização blockchain...');
            await loadSprints();
          } catch (hashError) {
            console.warn('⚠️ Erro ao atualizar blockchain_address (não crítico):', hashError);
          }

          customSetSuccess(`✅ Sucesso! Sprint criado. Hash: ${tx.hash}`, 'success');
        }
      } else {
        customSetSuccess(`✅ Sucesso! Sprint ${editSprint ? 'atualizado' : 'criado'} no banco de dados. (Blockchain indisponível)`, 'warning');
      }


      if (sprintContract && receipt) {
        console.log('💾 4. Salvando transação na blockchain_transactions...');
        try {
          await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprintId}/blockchain-transaction`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionHash: receipt.transactionHash,
              contractName: 'SprintManagement',
              methodName: editSprint ? 'updateSprintDataHash' : 'registerSprint',
              gasUsed: receipt.gasUsed?.toString(),
              gasPrice: receipt.gasPrice?.toString(),
              blockNumber: receipt.blockNumber,
              network: 'localhost',
              sprintName: sprintData.name,
              description: `Sprint "${sprintData.name}" ${editSprint ? 'atualizado' : 'criado'}`
            })
          });
          console.log('✅ 4. Transação salva na blockchain_transactions');
        } catch (transactionError) {
          console.warn('⚠️ Erro ao salvar transação (não crítico):', transactionError);
        }
      }

      setOpenDialog(false);
      resetForm();
      await loadSprints();


      setTimeout(async () => {
        await updateSprintMappingAfterBlockchainOperation();
      }, 500);

    } catch (error) {
      console.error('❌ Erro ao salvar sprint:', error);

      if (error.code === 4001) {
        setError('Transação cancelada pelo usuário');
      } else if (error.code === -32603) {
        setError('Erro na rede blockchain. Verifique se a rede Hardhat está rodando');
      } else {
        setError(error.message || 'Erro ao salvar sprint');
      }
    } finally {
      setLoadingAction(false);
    }
  };


  const handleDelete = async (sprint) => {
    setSprintToDelete(sprint);
    setOpenDeleteSprintDialog(true);
  };


  const confirmDeleteSprint = async () => {
    if (!sprintToDelete) return;

    const sprint = sprintToDelete;
    setOpenDeleteSprintDialog(false);


    if (sprint.status === 'active') {
      setError('Não é possível deletar sprints ativos');
      return;
    }

    if (!isConnected) {
      setError('Conecte sua carteira MetaMask para excluir o sprint');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Troque para a rede Hardhat no MetaMask');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);
      setSuccess(null);




      console.log('📝 1. Excluindo sprint do PostgreSQL...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprint.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir sprint do banco');
      }

      console.log('✅ 1. Sprint excluído do PostgreSQL - ID:', sprint.id);


      if (sprintContract && scrumContract) {
        console.log('� 2. Removendo sprint da blockchain...');


        if (!isTeamSyncedLocally()) {
          throw new Error('Equipe não está sincronizada com blockchain. Sincronize a equipe primeiro.');
        }


        const sprintMapping = blockchainMapping[sprint.id];
        let blockchainSprintId = sprintMapping?.blockchainId || sprint.blockchainId;

        if (!blockchainSprintId) {
          console.log('⚠️ Sprint não encontrado na blockchain, continuando apenas no DB');
          customSetSuccess('✅ Sucesso! Sprint excluído do banco de dados. (Sprint não existia na blockchain)', 'success');
        } else {

          const tx = await sprintContract.removeSprint(blockchainSprintId);


          const receipt = await tx.wait();
          console.log('✅ 2. Sprint removido da blockchain - Hash:', tx.hash);





          console.log('💾 4. Salvando transação na blockchain_transactions...');
          try {
            await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprint.id}/blockchain-transaction`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionHash: tx.hash,
                contractName: 'SprintManagement',
                methodName: 'removeSprint',
                gasUsed: receipt.gasUsed?.toString(),
                gasPrice: receipt.gasPrice?.toString(),
                blockNumber: receipt.blockNumber,
                network: 'localhost',
                sprintName: sprint.name,
                description: `Sprint "${sprint.name}" removido/excluído`
              })
            });

            console.log('✅ 4. Transação salva na blockchain_transactions');
          } catch (transactionError) {
            console.warn('⚠️ Erro ao salvar transação (não crítico):', transactionError);
          }

          customSetSuccess(`✅ Sprint excluído da blockchain! Hash: ${tx.hash}`, 'success');
        }
      }

      await loadSprints();

    } catch (error) {
      console.error('❌ Erro ao excluir sprint:', error);

      if (error.code === 4001) {
        setError('Transação cancelada pelo usuário');
      } else if (error.code === -32603) {
        setError('Erro na rede blockchain. Verifique se a rede Hardhat está rodando');
      } else {
        setError(error.message || 'Erro ao excluir sprint');
      }
    } finally {
      setLoadingAction(false);
    }
  };


  const handleStatusChange = async (sprint, newStatus) => {
    console.log('🔄 ALTERANDO STATUS DO SPRINT:');
    console.log('📊 Sprint:', {
      id: sprint.id,
      nome: sprint.name,
      statusAtual: sprint.status,
      novoStatus: newStatus,
      blockchainId: sprint.blockchainId
    });

    if (!isConnected) {
      setError('Conecte sua carteira MetaMask para alterar o status');
      return;
    }

    if (!isCorrectNetwork) {
      setError('Troque para a rede Hardhat no MetaMask');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);
      setSuccess(null);




      console.log('� 1. Atualizando status no PostgreSQL...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprint.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar status no banco');
      }

      console.log('✅ 1. Status atualizado no PostgreSQL');


      if (sprintContract && scrumContract) {
        console.log('🔗 2. Atualizando status na blockchain...');


        if (!isTeamSyncedLocally()) {
          console.warn('⚠️ Equipe não está sincronizada com blockchain. Continuando apenas no DB.');
        } else {
          const sprintMapping = blockchainMapping[sprint.id];
          const blockchainSprintId = sprintMapping?.blockchainId || sprint.blockchainId;

          if (!blockchainSprintId) {
            console.warn('⚠️ Sprint não encontrado na blockchain. Continuando apenas no DB.');
          } else {


        const statusMapping = { 'planning': 0, 'active': 1, 'completed': 2, 'cancelled': 3 };
        const statusId = statusMapping[newStatus] || 0;


        const tx = await sprintContract.updateSprintStatus(blockchainSprintId, statusId);


        const receipt = await tx.wait();
        console.log('✅ 2. Status atualizado na blockchain - Hash:', tx.hash);


        console.log('💾 3. Atualizando transactionHash no banco...');
        try {
          await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprint.id}/transaction-hash`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionHash: tx.hash
            })
          });
          console.log('✅ 3. TransactionHash atualizado no banco');
        } catch (hashError) {
          console.warn('⚠️ Erro ao atualizar transactionHash (não crítico):', hashError);
        }


        console.log('💾 4. Salvando transação na blockchain_transactions...');
        try {

          let methodName = '';
          switch (newStatus) {
            case 'active':
              methodName = 'startSprint';
              break;
            case 'completed':
              methodName = 'completeSprint';
              break;
            case 'cancelled':
              methodName = 'cancelSprint';
              break;
            default:
              methodName = 'updateSprintStatus';
          }

          await fetch(`${getApiUrl()}/api/groups/${currentTeam.id}/sprints/${sprint.id}/blockchain-transaction`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionHash: tx.hash,
              contractName: 'SprintManagement',
              methodName: methodName,
              gasUsed: receipt.gasUsed?.toString(),
              gasPrice: receipt.gasPrice?.toString(),
              blockNumber: receipt.blockNumber,
              network: 'localhost',
              sprintName: sprint.name,
              description: `Status do sprint "${sprint.name}" alterado para ${newStatus}`
            })
          });

          console.log('✅ 4. Transação salva na blockchain_transactions');
        } catch (transactionError) {
          console.warn('⚠️ Erro ao salvar transação (não crítico):', transactionError);
        }

        const actionText = newStatus === 'active' ? 'iniciado' : newStatus === 'completed' ? 'finalizado' : 'atualizado';
        customSetSuccess(`✅ Sprint ${actionText} na blockchain! Hash: ${tx.hash}`, 'success');
          }
        }
      }

      await loadSprints();

    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);

      if (error.code === 4001) {
        setError('Transação cancelada pelo usuário');
      } else if (error.code === -32603) {
        setError('Erro na rede blockchain. Verifique se a rede Hardhat está rodando');
      } else {
        setError(error.message || 'Erro ao alterar status');
      }
    } finally {
      setLoadingAction(false);
    }
  };


  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      backlogId: ''
    });
    setEditSprint(null);
  };


  const handleEdit = (sprint) => {
    setEditSprint(sprint);
    setFormData({
      name: sprint.name,
      description: sprint.description,
      startDate: sprint.startDate.toISOString().split('T')[0],
      endDate: sprint.endDate.toISOString().split('T')[0],
      backlogId: sprint.backlog_id || ''
    });
    setOpenDialog(true);
  };


  useEffect(() => {
    checkUserTeam();
  }, []);


  useEffect(() => {
    if (currentTeam?.id) {
      setBacklogLoaded(false);
      loadSprints();
      loadTeamMembers();
      checkBacklogItems();
    }
  }, [currentTeam?.id]);


  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);


  const statusOptions = [
    { value: 'planning', label: 'Planejamento', color: 'default' },
    { value: 'active', label: 'Ativo', color: 'primary' },
    { value: 'completed', label: 'Finalizado', color: 'success' },
    { value: 'cancelled', label: 'Cancelado', color: 'error' }
  ];


  const taskStatusOptions = [
    { value: 'todo', label: 'A Fazer', color: 'default' },
    { value: 'in_progress', label: 'Em Progresso', color: 'primary' },
    { value: 'review', label: 'Em Revisão', color: 'warning' },
    { value: 'done', label: 'Concluído', color: 'success' },
    { value: 'removed', label: 'Removido', color: 'error' }
  ];


  const handleManageTasks = (sprint) => {
    setCurrentSprintId(sprint.id);
    resetTaskForm();
    setOpenTaskDialog(true);

    if (!tasks[sprint.id]) {
      loadTasks(sprint.id);
    }
  };


  const getStatusColor = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.color : 'default';
  };


  const getStatusLabel = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!currentTeam) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info">
          Você precisa estar em uma equipe para acessar o gerenciamento de sprints.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <SprintIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Gerenciamento de Sprints - {currentTeam.name}
          </Typography>
          <Chip
            label={`Papel: ${currentTeam.member_role === 'Product Owner' || currentTeam.member_role === 'product_owner' ? 'Product Owner' :
              currentTeam.member_role === 'Scrum Master' || currentTeam.member_role === 'scrum_master' ? 'Scrum Master' :
                currentTeam.member_role === 'Developer' || currentTeam.member_role === 'developer' ? 'Developer' : currentTeam.member_role}`}
            color={currentTeam.member_role?.toLowerCase().includes('product') ? 'primary' :
              currentTeam.member_role?.toLowerCase().includes('scrum') ? 'secondary' : 'default'}
            sx={{ mb: 2 }}
          />
        </Box>
      </Box>

      {blockchainLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center">
            <CircularProgress size={20} sx={{ mr: 2 }} />
            Processando transação na blockchain... Aguarde a confirmação no MetaMask.
          </Box>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity={successType} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {}
      {loadingAction && (
        <Alert
          severity="info"
          icon={<CircularProgress size={20} />}
          sx={{ mb: 3 }}
        >
          Sincronizando com blockchain... Aguarde.
        </Alert>
      )}

      {}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Sprints
              </Typography>
              <Typography variant="h4">
                {sprints.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Sprint Ativo
              </Typography>
              <Typography variant="h4" color="primary.main">
                {sprints.filter(s => s.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Finalizados
              </Typography>
              <Typography variant="h4" color="success.main">
                {sprints.filter(s => s.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cancelados
              </Typography>
              <Typography variant="h4" color="error.main">
                {sprints.filter(s => s.status === 'cancelled').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {}
      {hasBacklogItems && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setOpenDialog(true);
            }}
            disabled={loading || blockchainLoading}
          >
            Criar Sprint
          </Button>
        </Box>
      )}

      {}
      {!hasBacklogItems && currentTeam?.id && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ textAlign: 'center' }}>
            Para criar uma sprint, é necessário ter pelo menos um item no backlog da equipe.
          </Alert>
        </Box>
      )}

      {}
      <Paper elevation={3}>
        {loading && sprints.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : sprints.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary">
              Nenhum sprint criado
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Crie o primeiro sprint para começar!
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Backlog Vinculado</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tarefas</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sprints.map((sprint) => (
                  <React.Fragment key={sprint.id}>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleSprintExpansion(sprint.id)}
                          >
                            {expandedSprints[sprint.id] ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ ml: 1 }}>
                            {sprint.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {sprint.description || 'Sem descrição'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {sprint.backlog_id ? (
                          <Typography variant="body2" color="primary">
                            {sprint.backlog_title || `Backlog #${sprint.backlog_id}`}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                            Nenhum backlog
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {sprint.startDate.toLocaleDateString('pt-BR')} - {sprint.endDate.toLocaleDateString('pt-BR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusOptions.find(opt => opt.value === sprint.status)?.label || sprint.status}
                          color={statusOptions.find(opt => opt.value === sprint.status)?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${tasks[sprint.id]?.length || 0} tarefas`}
                          color="info"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Adicionar Tarefa">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleManageTasks(sprint)}
                            disabled={loading}
                          >
                            <TaskIcon />
                          </IconButton>
                        </Tooltip>

                        {}
                        {sprint.status === 'planning' && (
                          <Tooltip title="Iniciar Sprint">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleStatusChange(sprint, 'active')}
                              disabled={loading || blockchainLoading}
                            >
                              <StartIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        {}
                        {sprint.status === 'active' && (
                          <Tooltip title="Finalizar Sprint">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleStatusChange(sprint, 'completed')}
                              disabled={loading || blockchainLoading}
                            >
                              <CompleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Editar Sprint">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(sprint)}
                            disabled={loading}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deletar Sprint">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(sprint)}
                            disabled={loading || sprint.status === 'active'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {}
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0 }}>
                        <Collapse in={expandedSprints[sprint.id]} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 4, backgroundColor: 'grey.50' }}>
                            <Typography variant="h6" gutterBottom>
                              Tarefas do Sprint
                            </Typography>

                            {tasks[sprint.id]?.length > 0 ? (
                              <List dense>
                                {tasks[sprint.id].map((task) => (
                                  <ListItem key={task.id} divider>
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Typography variant="subtitle2">
                                            {task.title}
                                          </Typography>
                                          <Chip
                                            label={taskStatusOptions.find(opt => opt.value === task.status)?.label || task.status}
                                            color={taskStatusOptions.find(opt => opt.value === task.status)?.color || 'default'}
                                            size="small"
                                          />
                                        </Box>
                                      }
                                      secondary={
                                        <Box>
                                          <Typography variant="body2" color="textSecondary">
                                            {task.description || 'Sem descrição'}
                                          </Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            Responsável: {task.assigned_to_name || 'Não atribuído'} |
                                            Estimativa: {TimeUtils.formatTimeDisplay(task.estimated_minutes)}
                                          </Typography>
                                        </Box>
                                      }
                                    />
                                    <ListItemSecondaryAction>
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        {task.status === 'todo' && (
                                          <Tooltip title="Iniciar Tarefa">
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                                            >
                                              <StartIcon />
                                            </IconButton>
                                          </Tooltip>
                                        )}

                                        {task.status === 'in_progress' && (
                                          <Tooltip title="Marcar como Concluído">
                                            <IconButton
                                              size="small"
                                              color="success"
                                              onClick={() => handleTaskStatusChange(task.id, 'done')}
                                            >
                                              <CompleteIcon />
                                            </IconButton>
                                          </Tooltip>
                                        )}

                                        <Tooltip title="Editar Tarefa">
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setCurrentSprintId(sprint.id);
                                              handleEditTask(task);
                                            }}
                                          >
                                            <EditIcon />
                                          </IconButton>
                                        </Tooltip>

                                        <Tooltip title="Deletar Tarefa">
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => {
                                              setCurrentSprintId(sprint.id);
                                              handleDeleteTask(task.id);
                                            }}
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                                Nenhuma tarefa criada para este sprint
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editSprint ? 'Editar Sprint' : 'Criar Sprint'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Sprint"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Descrição"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }} required>
            <InputLabel>Backlog Vinculado *</InputLabel>
            <Select
              value={formData.backlogId}
              onChange={(e) => setFormData(prev => ({ ...prev, backlogId: e.target.value }))}
              label="Backlog Vinculado *"
            >
              <MenuItem value="">
                <em>Selecione um item do backlog</em>
              </MenuItem>
              {backlogItems.map((backlog) => (
                <MenuItem key={backlog.id} value={backlog.id}>
                  {backlog.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                label="Data de Início"
                type="date"
                fullWidth
                variant="outlined"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Data de Fim"
                type="date"
                fullWidth
                variant="outlined"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading || blockchainLoading}
          >
            {(loading || blockchainLoading) ? <CircularProgress size={20} /> : (editSprint ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        open={openTaskDialog}
        onClose={() => setOpenTaskDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editTask ? 'Editar Tarefa' : 'Criar Tarefa'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título da Tarefa"
            fullWidth
            variant="outlined"
            value={taskFormData.title}
            onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Descrição"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={taskFormData.description}
            onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Responsável</InputLabel>
                <Select
                  value={taskFormData.assignedTo}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                  label="Responsável"
                >
                  <MenuItem value="">
                    <em>Não atribuído</em>
                  </MenuItem>
                  {teamMembers.map((member) => (
                    <MenuItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.name || member.username || 'Nome não informado'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Estimativa"
                type="time"
                fullWidth
                variant="outlined"
                value={taskFormData.estimatedHours || '02:00'}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                helperText={(() => {
                  const timeValue = taskFormData.estimatedHours || '02:00';
                  const minutes = TimeUtils.toBackend(timeValue);
                  const formatted = TimeUtils.formatTimeDisplay(minutes);
                  return `Estimativa: ${formatted}`;
                })()}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveTask}
            variant="contained"
            disabled={loading || blockchainLoading}
          >
            {(loading || blockchainLoading) ? <CircularProgress size={20} /> : (editTask ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        open={openDeleteSprintDialog}
        onClose={cancelDeleteSprint}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🗑️ Confirmar Exclusão do Sprint
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Deseja realmente excluir o sprint <strong>"{sprintToDelete?.name}"</strong>?
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            ⚠️ Todas as tarefas associadas também serão removidas.
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteSprint} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteSprint}
            variant="contained"
            color="error"
            disabled={loading || blockchainLoading}
            sx={{ ml: 1 }}
          >
            {(loading || blockchainLoading) ? <CircularProgress size={20} /> : 'Excluir Sprint'}
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog
        open={openDeleteTaskDialog}
        onClose={cancelDeleteTask}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🗑️ Confirmar Exclusão da Tarefa
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Deseja realmente excluir esta tarefa?
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteTask} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteTask}
            variant="contained"
            color="error"
            disabled={loading || blockchainLoading}
            sx={{ ml: 1 }}
          >
            {(loading || blockchainLoading) ? <CircularProgress size={20} /> : 'Excluir Tarefa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default SprintManagementPage;