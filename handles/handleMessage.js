// Fonction pour poser la question initiale à l'utilisateur
async function askInitialImagePurpose(senderId, imageUrl, pageAccessToken, sendMessage) {
  try {
    await sendMessage(senderId, { 
      text: 'Que souhaitez-vous faire avec cette image ?\n1. Analyser l\'image\n2. Répondre à une question\n3. Discuter à propos de l\'image\n4. Recadrer l\'image\n5. Appliquer un filtre\n6. Partager l\'image\n\nVeuillez répondre avec le **numéro** de l\'option choisie.' 
    }, pageAccessToken);
    
    // Stocker l'état de l'utilisateur pour attendre sa réponse
    userStates.set(senderId, { step: 'await_image_action', imageUrl });
  } catch (error) {
    console.error('Erreur lors de la demande d\'action pour l\'image :', error);
    await sendMessage(senderId, { text: 'Erreur lors de la gestion de votre demande.' }, pageAccessToken);
  }
}

// Fonction pour gérer la réponse de l'utilisateur et exécuter directement
async function handleImageAction(senderId, action, imageUrl, pageAccessToken, sendMessage) {
  try {
    switch (action) {
      case '1': // Analyser l'image
        await analyzeImage(senderId, imageUrl, pageAccessToken, sendMessage);
        break;
      case '2': // Répondre à une question sur l'image
        await sendMessage(senderId, { text: 'Quelle question avez-vous à propos de cette image ?' }, pageAccessToken);
        userStates.set(senderId, { step: 'await_image_question', imageUrl });
        break;
      case '3': // Discuter à propos de l'image
        await sendMessage(senderId, { text: 'Que voulez-vous savoir ou dire à propos de cette image ?' }, pageAccessToken);
        userStates.set(senderId, { step: 'await_image_discussion', imageUrl });
        break;
      case '4': // Recadrer l'image
        await sendMessage(senderId, { text: 'Recadrons l\'image. Quel cadrage souhaitez-vous ? (par exemple : carré, portrait, paysage)' }, pageAccessToken);
        userStates.set(senderId, { step: 'await_image_cropping', imageUrl });
        break;
      case '5': // Appliquer un filtre à l'image
        await sendMessage(senderId, { text: 'Quel filtre souhaitez-vous appliquer à l\'image ? (par exemple : noir et blanc, sepia, vibrant)' }, pageAccessToken);
        userStates.set(senderId, { step: 'await_image_filter', imageUrl });
        break;
      case '6': // Partager l'image
        await sendMessage(senderId, { text: 'Où souhaitez-vous partager cette image ? (par exemple : Facebook, Instagram, WhatsApp)' }, pageAccessToken);
        userStates.set(senderId, { step: 'await_image_share', imageUrl });
        break;
      default:
        await sendMessage(senderId, { text: 'Option non valide. Veuillez choisir 1, 2 ou 3.' }, pageAccessToken);
    }

    // Après avoir exécuté l'action choisie, proposer seulement trois options
    await sendMessage(senderId, { 
      text: 'Que souhaitez-vous faire ensuite ?\n1. Analyser l\'image\n2. Répondre à une question\n3. Traduire les textes dans l\'image\n\nVeuillez répondre avec le **numéro** de l\'option choisie.' 
    }, pageAccessToken);

    // Mettre à jour l'état de l'utilisateur pour limiter les options
    userStates.set(senderId, { step: 'await_follow_up_action', imageUrl });
    
  } catch (error) {
    console.error('Erreur lors de la gestion de l\'action pour l\'image :', error);
    await sendMessage(senderId, { text: 'Erreur lors de la gestion de votre demande.' }, pageAccessToken);
  }
}

// Gérer les interactions après la première tâche
async function handleFollowUpAction(senderId, action, imageUrl, pageAccessToken, sendMessage) {
  try {
    switch (action) {
      case '1': // Analyser l'image
        await analyzeImage(senderId, imageUrl, pageAccessToken, sendMessage);
        break;
      case '2': // Répondre à une question
        await sendMessage(senderId, { text: 'Quelle question avez-vous à propos de cette image ?' }, pageAccessToken);
        break;
      case '3': // Traduire les textes dans l'image
        await translateTextInImage(senderId, imageUrl, pageAccessToken, sendMessage);
        break;
      default:
        await sendMessage(senderId, { text: 'Option non valide. Veuillez choisir 1, 2 ou 3.' }, pageAccessToken);
    }
    
    // Après chaque interaction, on redemande ce que l'utilisateur veut faire
    await sendMessage(senderId, { 
      text: 'Voulez-vous faire autre chose ?\n1. Analyser l\'image\n2. Répondre à une autre question\n3. Traduire les textes dans l\'image\n\nVeuillez répondre avec le **numéro** de l\'option choisie.' 
    }, pageAccessToken);

  } catch (error) {
    console.error('Erreur lors de la gestion de l\'action suivante :', error);
    await sendMessage(senderId, { text: 'Erreur lors de la gestion de votre demande.' }, pageAccessToken);
  }
}
