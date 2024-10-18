<script lang="ts">
	import { page } from '$app/stores';
	import { io, Socket } from 'socket.io-client';
	import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Dropdown, Spinner, Alert, DropdownDivider, Radio } from 'flowbite-svelte';
	import { Toggle } from 'flowbite-svelte';
	import { Timeline, TimelineItem } from 'flowbite-svelte';
  import { EnvelopeOpenSolid, ChevronDownOutline, ExclamationCircleSolid, EnvelopeSolid, UserCircleSolid, FlagSolid } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import type { EmailMsg, ToggleEmailServiceMsg, RetryLevel, RetryLevelMsg } from '../lib/types';
	import logo from '$lib/images/Temporal_Symbol_dark_1_2x.png';

	$: activeUrl = $page.url.pathname;

	let emailService: boolean = true;
	let retryLevel: RetryLevel = "temporal";

	let submitted = false;
	let active = false;

	type CampaignEventStatus = "started" | "completed" | "failed";

	type CampaignEvent = {
		time: string;
		type: string;
		status: CampaignEventStatus;
		subject: string;
		content?: string;
	}

	let events: CampaignEvent[] = [];
	let email = "";

	const reset = () => {
		email = "";
		submitted = false;
		active = false;
		events = [];
	}

	let socket: Socket;

	const register = async () => {
		if (email !== "") {
			submitted = true;
			active = true;
			await socket.emitWithAck('register', { email });
		}
	}

	const toggleEmailService = async (event: Event) => {
		const target = event.target as HTMLInputElement;
		console.log('Toggling email service', target.checked);
		socket.emit('toggleEmailService', { status: target.checked } as ToggleEmailServiceMsg);
	}

	const toggleRetryLevel = async (event: Event) => {
		const target = event.target as HTMLInputElement;
		console.log('Toggling retry level', target.value);
		socket.emit('toggleRetryLevel', { level: target.value } as RetryLevelMsg);
	}

	onMount(() => {
		socket = io();

		socket.on('email:completed', (msg: EmailMsg) => {
			console.log('Email completed', msg);
			events = [...events, { ...msg.email, type: 'email', status: "completed" }];
		});

		socket.on('email:failed', (msg: EmailMsg) => {
			console.log('Email failed', msg);
			events = [...events, { ...msg.email, type: 'email', status: "failed", content: '' }];
		});

		socket.on('campaign:started', () => {
			console.log('Campaign started');
			events = [...events, { time: new Date().toTimeString(), type: 'campaign', status: "started", subject: 'Campaign Started' }];
		})

		socket.on('campaign:completed', () => {
			console.log('Campaign complete');
			active = false;
			events = [...events, { time: new Date().toTimeString(), type: 'campaign', status: "completed", subject: 'Campaign Completed' }];
		})

		socket.on('campaign:failed', () => {
			console.log('Campaign failed');
			active = false;
			events = [...events, { time: new Date().toTimeString(), type: 'campaign', status: "failed", subject: 'Campaign Failed' }];
		})

		socket.on('emailServiceStatus', (status: boolean) => {
			emailService = status;
		});

		socket.on('retryLevel', (msg: RetryLevelMsg) => {
			retryLevel = msg.level;
		});

		socket.emit('getEmailServiceStatus');
		socket.emit('getRetryLevel');
	});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Marketing Campaign Demo" />
</svelte:head>

<div class="relative px-8">
	<Navbar class="px-2 sm:px-4 py-2.5 fixed z-20 top-0 start-0 border-b shadow-lg">
		<NavBrand href="/">
			<img src="{logo}" class="me-2 h-12 sm:h-9" alt="Temporal Logo" />
			<span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Marketing Campaign Demo</span>
		</NavBrand>
		<NavHamburger />
		<NavUl {activeUrl} class="mr-4">
			<NavLi href="/" on:click={reset}>Home</NavLi>
			<NavLi href="http://localhost:8233/">Temporal UI</NavLi>
			<NavLi class="cursor-pointer">
				Settings<ChevronDownOutline class="w-6 h-6 ms-2 text-primary-800 dark:text-white inline" />
			</NavLi>
			<Dropdown placement="bottom-end">
				<li>
					<Toggle class="py-2 px-4" bind:checked={emailService} on:change={toggleEmailService}>Email Service</Toggle>
				</li>
				<DropdownDivider />
				<li>
					<fieldset class="py-2 px-4">
						<legend class="text-sm font-medium text-gray-900 dark:text-white">Retry Level</legend>
						<Radio class="py-2 px-4" name="durability" value="none" bind:group={retryLevel} on:change={toggleRetryLevel}>None</Radio>
						<Radio class="py-2 px-4" name="durability" value="workflow" bind:group={retryLevel} on:change={toggleRetryLevel}>Workflow</Radio>
						<Radio class="py-2 px-4" name="durability" value="temporal" bind:group={retryLevel} on:change={toggleRetryLevel}>Temporal</Radio>
					</fieldset>
				</li>
			</Dropdown>
		</NavUl>
	</Navbar>

	<div class="mt-20">
		<section class="bg-white dark:bg-gray-900 border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
			<div class="py-6 px-4 mx-auto max-w-screen-xl lg:py-12 lg:px-6">
					<div class="mx-auto max-w-screen-md sm:text-center">
							<h2 class="mb-4 text-3xl tracking-tight font-extrabold text-gray-900 sm:text-4xl dark:text-white">Sign up for our newsletter</h2>
							<p class="mx-auto mb-8 max-w-2xl font-light text-gray-500 md:mb-12 sm:text-xl dark:text-gray-400">Stay up to date with the roadmap progress, announcements and exclusive discounts feel free to sign up with your email.</p>
							{#if submitted}
								<Alert color="green">
									<span class="font-medium">Thanks for signing up!</span>
									We'll be in touch shortly!
								</Alert>
							{:else}
								<form action="#">
									<div class="items-center mx-auto mb-3 space-y-4 max-w-screen-sm sm:flex sm:space-y-0">
											<div class="relative w-full">
													<label for="email" class="hidden mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Email address</label>
													<div class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
															<svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
													</div>
													<input class="block p-3 pl-10 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 sm:rounded-none sm:rounded-l-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500" placeholder="Enter your email" type="email" bind:value={email} required>
											</div>
											<div>
													<button type="submit" class="py-3 px-5 w-full text-sm font-medium text-center text-white rounded-lg border cursor-pointer bg-primary-700 border-primary-600 sm:rounded-none sm:rounded-r-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800" on:click={register}>Subscribe</button>
											</div>
									</div>
									<div class="mx-auto max-w-screen-sm text-sm text-left text-gray-500 newsletter-form-footer dark:text-gray-300">We care about the protection of your data. <a href="/" class="font-medium text-primary-600 dark:text-primary-500 hover:underline">Read our Privacy Policy</a>.</div>
								</form>
							{/if}
					</div>
			</div>
		</section>

		{#if submitted}
			<section class="bg-white dark:bg-gray-900 border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
				<Timeline order="vertical" class="w-full">
					{#each events as event}
						<TimelineItem title={event.subject} date={event.time}>
							<svelte:fragment slot="icon">
								{#if event.type === "email"}
									{#if event.status == "completed"}
										<span class="flex absolute -start-3 justify-center items-center w-6 h-6 bg-primary-200 rounded-full ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
											<EnvelopeOpenSolid class="w-4 h-4 text-primary-600 dark:text-primary-400" />
										</span>
									{:else}
										<span class="flex absolute -start-3 justify-center items-center w-6 h-6 bg-red-200 rounded-full ring-8 ring-white dark:ring-gray-900 dark:bg-red-900">
											<EnvelopeSolid class="w-4 h-4 text-red-600 dark:text-red-400" />
										</span>
									{/if}
								{:else if event.type === "campaign"}
									{#if event.status == "started"}
										<span class="flex absolute -start-3 justify-center items-center w-6 h-6 bg-green-200 rounded-full ring-8 ring-white dark:ring-gray-900 dark:bg-green-900">
											<UserCircleSolid class="w-4 h-4 text-green-600 dark:text-green-400" />
										</span>
									{:else if event.status == "completed"}
										<span class="flex absolute -start-3 justify-center items-center w-6 h-6 bg-green-200 rounded-full ring-8 ring-white dark:ring-gray-900 dark:bg-green-900">
											<FlagSolid class="w-4 h-4 text-green-600 dark:text-green-400" />
										</span>
									{:else}
										<span class="flex absolute -start-3 justify-center items-center w-6 h-6 bg-red-200 rounded-full ring-8 ring-white dark:ring-gray-900 dark:bg-red-900">
											<ExclamationCircleSolid class="w-4 h-4 text-red-600 dark:text-red-400" />
										</span>
									{/if}
								{/if}
							</svelte:fragment>
							{#if event.content}
								<p>{event.content}</p>
							{/if}
						</TimelineItem>
					{/each}
				</Timeline>
				{#if active}<Spinner />{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 20px;
		margin-top: 20px;
	}
</style>