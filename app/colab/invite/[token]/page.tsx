'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInviteByToken, acceptInvite } from '@/lib/colab/firestore';
import { useColabSession } from '@/lib/colab/useColabSession';
